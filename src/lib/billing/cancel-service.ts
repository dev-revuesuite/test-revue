// Server only: the owner cancels their plan (all their workspaces).
//
// The subscription is always cancelled at Razorpay RIGHT AWAY, so no further
// charge is possible. Access is ours to decide: the workspaces keep the plan
// until the end of the cycle that was actually paid for (paid_until), then
// become view-only. A subscription whose renewal was failing has nothing paid
// left, so its access ends now.
//
// (We don't use Razorpay's "cancel at cycle end": after such a request Razorpay
// showed no sign of a scheduled cancellation, and "you won't be charged again"
// must not depend on something we can't verify.)

import { RazorpayApiError, type RazorpayApi, type RazorpaySubscription } from "@/lib/billing/razorpay-api"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { applyRemoteSubscription, type ApplyEventFn } from "@/lib/billing/sync-service"

export type CancelStore = {
  isOwner(organizationId: string, userId: string): Promise<boolean>
  getOpenSubscription(ownerId: string): Promise<{
    id: string
    razorpay_subscription_id: string
    razorpay_plan_id: string
    status: string
  } | null>
  /** End of the last cycle that was actually paid (null: nothing paid). */
  getPaidUntil(subscriptionRowId: string): Promise<string | null>
  /** Ends a failing subscription's grace period now and updates the owner's workspaces. */
  endGraceNow(subscriptionRowId: string): Promise<void>
}

const ENDED_STATUSES = new Set(["cancelled", "completed", "expired"])
// Renewal failed: the paid cycle is over, whatever dates Razorpay shows.
const FAILING_STATUSES = new Set(["pending", "halted"])
const LOG = "[billing-cancel]"

export async function cancelPlan(
  input: { userId: string; organizationId: string },
  deps: {
    store: CancelStore
    razorpay: Pick<RazorpayApi, "cancelSubscription" | "fetchSubscription" | "listPaidInvoices">
    applyEvent: ApplyEventFn
    now?: () => Date
  },
): Promise<{ atPeriodEnd: boolean; endsAt: string | null }> {
  const { store, razorpay } = deps
  const now = deps.now ?? (() => new Date())

  if (!(await store.isOwner(input.organizationId, input.userId))) {
    throw new BillingRequestError(403, "NOT_OWNER", "Only the organization owner can cancel the plan.")
  }

  const open = await store.getOpenSubscription(input.userId)
  if (!open || open.status === "created") {
    throw new BillingRequestError(404, "NO_SUBSCRIPTION", "There's no paid plan to cancel.")
  }

  let cancelled: RazorpaySubscription
  try {
    cancelled = await razorpay.cancelSubscription(open.razorpay_subscription_id)
  } catch (error) {
    if (!(error instanceof RazorpayApiError)) throw error
    // Razorpay refuses to cancel what has already ended (e.g. cancelled from
    // its dashboard and the webhook was missed). If so, that's what we record.
    const remote = await razorpay.fetchSubscription(open.razorpay_subscription_id).catch(() => null)
    if (!remote || !ENDED_STATUSES.has(remote.status)) {
      console.error(LOG, "Razorpay cancel failed:", error.httpStatus, error.razorpayCode ?? "", error.message)
      throw new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "Couldn't cancel with the payment provider. Please try again.")
    }
    cancelled = remote
  }

  if (!ENDED_STATUSES.has(cancelled.status)) {
    // Never tell a customer "you won't be charged again" unless Razorpay says it has ended.
    console.error(LOG, `Razorpay answered "${cancelled.status}" to a cancel of ${open.razorpay_subscription_id}`)
    throw new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "Couldn't cancel with the payment provider. Please try again.")
  }

  // Record it through the same path as a webhook. Best effort: Razorpay has
  // already cancelled, and its webhook / the daily check catch up.
  try {
    await applyRemoteSubscription(open.razorpay_subscription_id, { ...deps, now }, cancelled)
  } catch (error) {
    console.warn(LOG, "Couldn't refresh after cancelling:", error instanceof Error ? error.message : error)
  }

  if (FAILING_STATUSES.has(open.status)) {
    // The owner chose to cancel a plan whose payment was failing: nothing is
    // paid, so access ends now. (A failing subscription that is only REPLACED
    // by "Pay now" keeps its grace period: see billing v9.)
    try {
      await store.endGraceNow(open.id)
    } catch (error) {
      console.warn(LOG, "Couldn't end the grace period after cancelling:", error instanceof Error ? error.message : error)
    }
    return { atPeriodEnd: false, endsAt: null }
  }

  const paidUntil = await store.getPaidUntil(open.id).catch(() => null)
  const keepsAccess = paidUntil !== null && new Date(paidUntil).getTime() > now().getTime()
  return { atPeriodEnd: keepsAccess, endsAt: keepsAccess ? paidUntil : null }
}
