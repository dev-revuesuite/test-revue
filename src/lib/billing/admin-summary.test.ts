import { describe, expect, it } from "vitest"

import { subscriptionState, summarizeBilling, type AdminSubscription } from "@/lib/billing/admin-summary"

const NOW = new Date("2026-11-21T12:00:00.000Z")
const FUTURE = "2026-12-20T00:00:00.000Z"
const PAST = "2026-11-01T00:00:00.000Z"
const PRICES = { plus: { monthly: 2499, annual: 24999 }, business: { monthly: 9999, annual: 99999 } }

const sub = (over: Partial<AdminSubscription> = {}): AdminSubscription => ({
  status: "active",
  plan_id: "plus",
  billing_cycle: "monthly",
  paid_until: FUTURE,
  grace_ends_at: null,
  ...over,
})

describe("subscriptionState", () => {
  it.each([
    ["an active subscription", sub(), "paying"],
    ["a failed payment inside the 7 days", sub({ status: "halted", grace_ends_at: FUTURE }), "payment_failing"],
    ["a failed payment after the 7 days", sub({ status: "pending", grace_ends_at: PAST }), "ended"],
    ["cancelled with paid time left", sub({ status: "cancelled" }), "cancelled_with_time_left"],
    ["cancelled, paid time over", sub({ status: "cancelled", paid_until: PAST }), "ended"],
    ["replaced while the payment was failing, grace left", sub({ status: "cancelled", grace_ends_at: FUTURE }), "payment_failing"],
    ["ended while the payment was failing, grace over", sub({ status: "cancelled", grace_ends_at: PAST }), "ended"],
    ["an unpaid checkout", sub({ status: "created", paid_until: null }), "not_paid"],
  ])("%s", (_label, input, expected) => {
    expect(subscriptionState(input, NOW)).toBe(expected)
  })
})

describe("summarizeBilling", () => {
  it("counts each state and what paying customers bring in per month", () => {
    const summary = summarizeBilling(
      [
        sub(),
        sub({ plan_id: "business", billing_cycle: "annual" }),
        sub({ status: "halted", grace_ends_at: FUTURE }),
        sub({ status: "cancelled" }),
        sub({ status: "cancelled", paid_until: PAST }),
        sub({ status: "created", paid_until: null }),
      ],
      [],
      PRICES,
      NOW,
    )
    expect(summary).toMatchObject({ paying: 2, paymentFailing: 1, cancelledWithTimeLeft: 1, ended: 1 })
    // 2,499 + 99,999 / 12
    expect(summary.monthlyRunRateInr).toBe(Math.round(2499 + 99999 / 12))
  })

  it("adds up this month's payments and takes refunds off", () => {
    const summary = summarizeBilling(
      [],
      [
        { amount_paise: 249900, amount_refunded_paise: 0, status: "captured", paid_at: "2026-11-05T00:00:00.000Z" },
        { amount_paise: 999900, amount_refunded_paise: 999900, status: "refunded", paid_at: "2026-11-20T00:00:00.000Z" },
        { amount_paise: 90000, amount_refunded_paise: 0, status: "captured", paid_at: "2026-10-30T00:00:00.000Z" },
        { amount_paise: 50000, amount_refunded_paise: 0, status: "captured", paid_at: null },
      ],
      PRICES,
      NOW,
    )
    expect(summary.receivedThisMonthInr).toBe(2499)
    expect(summary.refundedThisMonthInr).toBe(9999)
  })
})
