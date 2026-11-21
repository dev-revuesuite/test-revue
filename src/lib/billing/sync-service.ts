// Server only: brings an organization's subscription up to date by asking
// Razorpay directly (with our secret key), then applying the answer through the
// same database function the webhook uses.
//
// Why: webhooks can be late, fail, or (as in testing) be refused. After the
// checkout says "paid", and whenever the Plan tab sees an unfinished checkout,
// the app calls this so the plan unlocks without waiting. The browser can't fake
// it: the status comes from Razorpay's API, not from the browser.

import type { RazorpayApi, RazorpaySubscription } from "@/lib/billing/razorpay-api"
import { RazorpayApiError } from "@/lib/billing/razorpay-api"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import {
  RAZORPAY_SUBSCRIPTION_STATUSES,
  type NormalizedSubscription,
  type NormalizedWebhookEvent,
} from "@/lib/billing/webhook-event"
import type { ApplyEventResult } from "@/lib/billing/webhook-service"

export type SyncStore = {
  isOwner(organizationId: string, userId: string): Promise<boolean>
  /** The owner's newest subscription (plans belong to the owner's account). */
  getLatestSubscription(ownerId: string): Promise<{
    id: string
    razorpay_subscription_id: string
    razorpay_plan_id: string
    status: string
  } | null>
  getOrgPlanId(organizationId: string): Promise<string | null>
}

export type SyncResult = {
  status: string | null
  result: string
  planId: string | null
  /** Which subscription `status` is about (the owner's newest one). */
  subscriptionId: string | null
}

const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null)

export type ApplyEventFn = (event: NormalizedWebhookEvent, payload: unknown) => Promise<ApplyEventResult>
export type RemoteReader = Pick<RazorpayApi, "fetchSubscription" | "listPaidInvoices">

/**
 * Asks Razorpay for one subscription and applies its current state (and its
 * latest paid invoice) through billing_apply_event, exactly like a webhook.
 * Shared by the owner-triggered sync, cancel and the daily reconcile.
 * Throws RazorpayApiError if Razorpay fails, BillingRequestError otherwise.
 */
export async function applyRemoteSubscription(
  razorpaySubscriptionId: string,
  deps: { razorpay: RemoteReader; applyEvent: ApplyEventFn; now?: () => Date },
  /** Pass it when it was just fetched, to avoid asking Razorpay twice. */
  prefetched?: RazorpaySubscription,
): Promise<{ status: string; result: string }> {
  const now = deps.now ?? (() => new Date())
  const remote =
    prefetched && prefetched.id === razorpaySubscriptionId
      ? prefetched
      : await deps.razorpay.fetchSubscription(razorpaySubscriptionId)
  if (!RAZORPAY_SUBSCRIPTION_STATUSES.includes(remote.status as NormalizedSubscription["status"])) {
    throw new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "Unexpected status from the payment provider.")
  }
  if (remote.status === "created") {
    return { status: "created", result: "unchanged" }
  }

  const [paid] = await deps.razorpay.listPaidInvoices(remote.id)
  const event: NormalizedWebhookEvent = {
    // Same Razorpay state -> same ID -> applied only once.
    event_id: `sync_${remote.id}_${remote.status}_${remote.currentEnd ?? 0}_${paid?.paymentId ?? "none"}`,
    event_type: "subscription.synced",
    // Whole seconds, like Razorpay's own event times, so a webhook sent in the
    // same second as this check is never treated as older than it.
    created_at: new Date(Math.floor(now().getTime() / 1000) * 1000).toISOString(),
    subscription: {
      id: remote.id,
      plan_id: remote.planId,
      status: remote.status as NormalizedSubscription["status"],
      current_start: iso(remote.currentStart),
      current_end: iso(remote.currentEnd),
    },
    payment: paid
      ? {
          id: paid.paymentId,
          amount: paid.amount,
          amount_refunded: 0,
          currency: paid.currency,
          status: "captured",
          method: null,
          invoice_id: paid.invoiceId,
          created_at: iso(paid.paidAt),
          // What this payment paid for. Razorpay's current_end can already
          // point at the next, unpaid cycle, so it is never used as "paid until".
          period_end: iso(paid.billingEnd),
        }
      : null,
    refund: null,
  }

  const { data, error } = await deps.applyEvent(event, { source: "sync", subscription: remote, latest_paid_invoice: paid ?? null })
  if (error) {
    console.error("[billing-sync] Applying the Razorpay status failed:", error.message)
    throw new BillingRequestError(500, "BILLING_SYNC_FAILED", "Couldn't update the plan. Please try again.")
  }
  return { status: remote.status, result: typeof data?.result === "string" ? data.result : "applied" }
}

export async function syncSubscription(
  input: { userId: string; organizationId: string },
  deps: {
    store: SyncStore
    razorpay: RemoteReader
    applyEvent: ApplyEventFn
    now?: () => Date
  },
): Promise<SyncResult> {
  const { store } = deps

  if (!(await store.isOwner(input.organizationId, input.userId))) {
    throw new BillingRequestError(403, "NOT_OWNER", "Only the organization owner can manage billing.")
  }

  const latest = await store.getLatestSubscription(input.userId)
  if (!latest) {
    return { status: null, result: "none", planId: await store.getOrgPlanId(input.organizationId), subscriptionId: null }
  }

  let applied: { status: string; result: string }
  try {
    applied = await applyRemoteSubscription(latest.razorpay_subscription_id, deps)
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error("[billing-sync] Razorpay call failed:", error.httpStatus, error.razorpayCode ?? "", error.message)
      throw new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider isn't responding. Please try again.")
    }
    throw error
  }

  return {
    ...applied,
    planId: await store.getOrgPlanId(input.organizationId),
    subscriptionId: latest.razorpay_subscription_id,
  }
}
