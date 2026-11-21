// Server only: starts a checkout for an organization.
//
// Creates a Razorpay subscription on the plan the SERVER picks, saves it as
// "created" (pending) and returns the subscription ID + public key ID for the
// checkout pop-up. Nothing here unlocks a plan: only the webhook does that.

import {
  BillingInputError,
  parsePlanChoice,
  razorpayPlanIdFor,
  type BillingConfig,
  type BillingCycle,
  type PaidPlanId,
  type PlanChoice,
} from "@/lib/billing/billing-plans"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { RazorpayApiError, type RazorpayApi } from "@/lib/billing/razorpay-api"
import { applyRemoteSubscription, type ApplyEventFn } from "@/lib/billing/sync-service"

export { BillingRequestError }

export type OpenSubscription = {
  id: string
  razorpay_subscription_id: string
  razorpay_plan_id: string
  status: string
  cancel_at_period_end?: boolean
  current_period_end?: string | null
}

export type NewSubscriptionRow = {
  organization_id: string
  razorpay_subscription_id: string
  razorpay_plan_id: string
  plan_id: PaidPlanId
  billing_cycle: BillingCycle
  status: "created"
  created_by: string
}

/** Database access (service role). See subscribe-store.ts. */
export type SubscribeStore = {
  isOwner(organizationId: string, userId: string): Promise<boolean>
  getOrgPlanId(organizationId: string): Promise<string | null>
  /** True when the workspace's plan was set by a subscription (not by hand). */
  isPlanFromBilling(organizationId: string): Promise<boolean>
  /** The owner's newest subscription in a live status (incl. unpaid "created"). */
  getOpenSubscription(ownerId: string): Promise<OpenSubscription | null>
  insertSubscription(row: NewSubscriptionRow): Promise<{ ok: true } | { ok: false; conflict: boolean }>
}

export type StartSubscriptionResult = {
  subscriptionId: string
  keyId: string
  plan: PaidPlanId
  cycle: BillingCycle
}

// How many billing cycles the autopay mandate covers (5 years).
const TOTAL_COUNT: Record<BillingCycle, number> = { monthly: 60, annual: 5 }

const ENDED_STATUSES = new Set(["cancelled", "completed", "expired"])
// Renewal failed: Razorpay is retrying (pending) or has given up (halted).
const FAILING_STATUSES = new Set(["pending", "halted"])
const LOG = "[billing-subscribe]"

export async function startSubscription(
  input: {
    userId: string
    organizationId: string
    body: unknown
    /** The customer confirmed switching away from a plan that is still running. */
    replace?: boolean
  },
  deps: { store: SubscribeStore; razorpay: RazorpayApi; config: BillingConfig; applyEvent: ApplyEventFn },
): Promise<StartSubscriptionResult> {
  const { store, razorpay, config } = deps

  let choice: PlanChoice
  try {
    choice = parsePlanChoice(input.body)
  } catch (error) {
    if (error instanceof BillingInputError) throw new BillingRequestError(400, error.code, error.message)
    throw error
  }
  const razorpayPlanId = razorpayPlanIdFor(choice, config)

  if (!(await store.isOwner(input.organizationId, input.userId))) {
    throw new BillingRequestError(403, "NOT_OWNER", "Only the organization owner can change the plan.")
  }

  try {
    // Plans belong to the owner's account: one live subscription per owner,
    // whichever workspace they start the checkout from.
    const open = await store.getOpenSubscription(input.userId)

    if (open && FAILING_STATUSES.has(open.status)) {
      // The last renewal failed (the paid period is over). Buying again replaces
      // that subscription, so a customer is never stuck behind a payment method
      // that no longer works. Ask Razorpay first: it may have been paid since.
      const remote = await razorpay.fetchSubscription(open.razorpay_subscription_id)
      if (FAILING_STATUSES.has(remote.status)) {
        // Cancelled right away, so Razorpay stops retrying and can't charge the
        // old subscription on top of the new one.
        const cancelled = await razorpay.cancelSubscription(open.razorpay_subscription_id)
        await applyRemoteSubscription(open.razorpay_subscription_id, deps, cancelled)
      } else {
        // Paid since (live again), or already ended at Razorpay. An ended one
        // was failing, so nothing is paid up: a new subscription can start.
        // (Razorpay's current_end is no guide here: it already points at the
        // unpaid cycle.)
        await applyRemoteSubscription(open.razorpay_subscription_id, deps, remote)
        if (!ENDED_STATUSES.has(remote.status)) throw alreadySubscribed()
      }
    } else if (open && open.status !== "created") {
      // A paid, running plan (active / authenticated / paused).
      if (open.razorpay_plan_id === razorpayPlanId) {
        throw new BillingRequestError(409, "SAME_PLAN", "You're already on this plan.")
      }
      // Switching to another plan or billing period only when the customer
      // asked for exactly that (the plan picker says what happens first).
      if (!input.replace) throw alreadySubscribed()

      // The running subscription is cancelled at Razorpay first, so two
      // subscriptions can never charge side by side. What was paid for stays:
      // the customer keeps their current plan until the paid period ends, even
      // if they don't finish the new payment. The new plan starts at full
      // price once paid (no credit for unused days: decided 2026-11-21).
      let ended: Awaited<ReturnType<RazorpayApi["cancelSubscription"]>>
      try {
        ended = await razorpay.cancelSubscription(open.razorpay_subscription_id)
      } catch (error) {
        if (!(error instanceof RazorpayApiError)) throw error
        // Razorpay refuses to cancel what has already ended (cancelled from its
        // dashboard, or completed, and we missed the webhook). If that's what
        // happened, record it and carry on; any other failure stops here.
        const remote = await razorpay.fetchSubscription(open.razorpay_subscription_id)
        if (!ENDED_STATUSES.has(remote.status)) throw error
        ended = remote
      }
      await applyRemoteSubscription(open.razorpay_subscription_id, deps, ended)
    } else if (open) {
      // An earlier checkout that wasn't finished: ask Razorpay what really happened.
      const remote = await razorpay.fetchSubscription(open.razorpay_subscription_id)
      if (remote.status !== "created") {
        // Paid (or ended) since: record it through the same path as a webhook,
        // so a payment is never lost by writing a status directly.
        await applyRemoteSubscription(open.razorpay_subscription_id, deps, remote)
        if (!ENDED_STATUSES.has(remote.status) || stillPaidUp(remote.currentEnd)) throw alreadySubscribed()
      } else if (open.razorpay_plan_id === razorpayPlanId) {
        return result(open.razorpay_subscription_id)
      } else {
        // Switching plans: cancel the unpaid checkout, then record what Razorpay
        // says. If it was paid in the very same moment, its paid period is kept
        // and no second subscription is started.
        const cancelled = await razorpay.cancelSubscription(open.razorpay_subscription_id)
        await applyRemoteSubscription(open.razorpay_subscription_id, deps, cancelled)
        if (cancelled.currentEnd) throw alreadySubscribed()
      }
    } else {
      // No running subscription. A paid plan that came from billing means the
      // customer cancelled and still has paid time left: they may subscribe
      // again right away. A paid plan set by hand (e.g. Enterprise) is not
      // ours to replace.
      const planId = await store.getOrgPlanId(input.organizationId)
      if (planId && planId !== "free" && !(await store.isPlanFromBilling(input.organizationId))) {
        throw new BillingRequestError(409, "PLAN_ACTIVE", "This organization's plan is managed by our team. Contact support to change it.")
      }
    }

    const created = await razorpay.createSubscription({
      planId: razorpayPlanId,
      totalCount: TOTAL_COUNT[choice.cycle],
      notes: { organization_id: input.organizationId, created_by: input.userId },
    })

    const saved = await store.insertSubscription({
      organization_id: input.organizationId,
      razorpay_subscription_id: created.id,
      razorpay_plan_id: razorpayPlanId,
      plan_id: choice.plan,
      billing_cycle: choice.cycle,
      status: "created",
      created_by: input.userId,
    })

    if (!saved.ok) {
      await cancelQuietly(razorpay, created.id)
      if (saved.conflict) {
        throw new BillingRequestError(409, "CHECKOUT_IN_PROGRESS", "A checkout was just started. Please refresh and try again.")
      }
      throw new BillingRequestError(500, "BILLING_SAVE_FAILED", "Couldn't start the checkout. Please try again.")
    }

    return result(created.id)
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error(LOG, "Razorpay call failed:", error.httpStatus, error.razorpayCode ?? "", error.message)
      throw new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider isn't responding. Please try again.")
    }
    throw error
  }

  function result(subscriptionId: string): StartSubscriptionResult {
    return { subscriptionId, keyId: config.keyId, plan: choice.plan, cycle: choice.cycle }
  }
}

/** Razorpay period end (unix seconds) still in the future = paid time left. */
function stillPaidUp(currentEnd: number | undefined): boolean {
  return typeof currentEnd === "number" && currentEnd * 1000 > Date.now()
}

function alreadySubscribed() {
  return new BillingRequestError(409, "ALREADY_SUBSCRIBED", "This organization already has a subscription.")
}

async function cancelQuietly(razorpay: RazorpayApi, subscriptionId: string) {
  try {
    await razorpay.cancelSubscription(subscriptionId)
  } catch (error) {
    // Unpaid "created" subscriptions expire on their own; log so it can be checked.
    console.warn(LOG, `Couldn't cancel unused subscription ${subscriptionId}:`, error instanceof Error ? error.message : error)
  }
}
