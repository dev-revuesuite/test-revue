// Which of an owner's subscription rows describes their plan right now.
//
// There is one row per checkout attempt, so "the newest row" is often an
// abandoned or never-paid checkout sitting in front of the real subscription.
// Used by the billing card and the plan picker (browser), so it has no imports.

export type SubscriptionLike = { status: string; paid_until?: string | null }

// Bought and not ended at Razorpay (includes a failing renewal).
const LIVE = new Set(["authenticated", "active", "pending", "halted", "paused"])

/**
 * `rows` must be newest first. Returns the live subscription if there is one,
 * else the newest one that was ever paid (cancelled or ended), else null.
 * Unpaid checkouts ("created"), expired ones and cancelled-without-paying rows
 * are never "the subscription".
 */
export function pickRelevantSubscription<T extends SubscriptionLike>(rows: readonly T[]): T | null {
  const live = rows.find((row) => LIVE.has(row.status))
  if (live) return live
  return rows.find((row) => row.status !== "created" && Boolean(row.paid_until)) ?? null
}
