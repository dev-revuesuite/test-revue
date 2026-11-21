// Server only: plain-data helpers for the internal billing page
// (/internal/billing, platform developers only).

export type AdminSubscription = {
  status: string
  plan_id: string
  billing_cycle: string
  paid_until: string | null
  grace_ends_at: string | null
}

export type AdminPayment = {
  amount_paise: number
  amount_refunded_paise: number
  status: string
  paid_at: string | null
}

export type SubscriptionState = "paying" | "payment_failing" | "cancelled_with_time_left" | "ended" | "not_paid"

export const STATE_LABELS: Record<SubscriptionState, string> = {
  paying: "Paying",
  payment_failing: "Payment failing",
  cancelled_with_time_left: "Cancelled, time left",
  ended: "Ended",
  not_paid: "Never paid",
}

const after = (iso: string | null, now: Date) => iso !== null && new Date(iso).getTime() > now.getTime()

/** Where a subscription stands, in the words the team uses. */
export function subscriptionState(sub: AdminSubscription, now: Date = new Date()): SubscriptionState {
  if (sub.status === "active") return "paying"
  if (sub.status === "pending" || sub.status === "halted") {
    return after(sub.grace_ends_at, now) ? "payment_failing" : "ended"
  }
  if (sub.status === "cancelled" || sub.status === "completed") {
    // Ended while a payment was failing: the rest of the 7 days still counts.
    if (sub.grace_ends_at) return after(sub.grace_ends_at, now) ? "payment_failing" : "ended"
    return after(sub.paid_until, now) ? "cancelled_with_time_left" : "ended"
  }
  if (sub.status === "created" || sub.status === "authenticated" || sub.status === "expired") return "not_paid"
  return "ended"
}

export type BillingSummary = {
  paying: number
  paymentFailing: number
  cancelledWithTimeLeft: number
  ended: number
  /** Rupees expected per month from paying subscriptions (annual plans / 12). */
  monthlyRunRateInr: number
  /** Rupees received this calendar month (UTC), refunds taken off. */
  receivedThisMonthInr: number
  refundedThisMonthInr: number
}

export function summarizeBilling(
  subscriptions: AdminSubscription[],
  payments: AdminPayment[],
  prices: Record<string, Record<string, number>>,
  now: Date = new Date(),
): BillingSummary {
  const summary: BillingSummary = {
    paying: 0,
    paymentFailing: 0,
    cancelledWithTimeLeft: 0,
    ended: 0,
    monthlyRunRateInr: 0,
    receivedThisMonthInr: 0,
    refundedThisMonthInr: 0,
  }

  for (const sub of subscriptions) {
    const state = subscriptionState(sub, now)
    if (state === "paying") {
      summary.paying++
      const price = prices[sub.plan_id]?.[sub.billing_cycle] ?? 0
      summary.monthlyRunRateInr += sub.billing_cycle === "annual" ? price / 12 : price
    } else if (state === "payment_failing") summary.paymentFailing++
    else if (state === "cancelled_with_time_left") summary.cancelledWithTimeLeft++
    else if (state === "ended") summary.ended++
  }
  summary.monthlyRunRateInr = Math.round(summary.monthlyRunRateInr)

  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  let received = 0
  let refunded = 0
  for (const payment of payments) {
    if (!payment.paid_at || new Date(payment.paid_at).getTime() < monthStart) continue
    received += payment.amount_paise
    refunded += payment.amount_refunded_paise
  }
  summary.receivedThisMonthInr = (received - refunded) / 100
  summary.refundedThisMonthInr = refunded / 100
  return summary
}
