import { describe, expect, it } from "vitest"

import { paymentStatusLabel } from "@/components/billing/payment-history"
import { describeSubscription } from "@/components/billing/use-current-subscription"

const NOW = new Date("2026-11-21T00:00:00.000Z")
const row = (over: Record<string, unknown> = {}) => ({
  plan_id: "plus",
  billing_cycle: "monthly",
  status: "active",
  grace_ends_at: null,
  current_period_end: "2026-12-20T00:00:00.000Z",
  paid_until: "2026-12-20T00:00:00.000Z",
  ...over,
})

describe("describeSubscription (what the plan picker shows)", () => {
  it("a running plan can be switched", () => {
    expect(describeSubscription(row(), NOW)).toEqual({
      plan: "plus",
      cycle: "monthly",
      state: "running",
      paidUntil: "2026-12-20T00:00:00.000Z",
    })
    expect(describeSubscription(row({ plan_id: "business", billing_cycle: "annual" }), NOW)).toMatchObject({
      plan: "business",
      cycle: "annual",
    })
  })

  it("a cancelled plan with paid time left is 'ending' (can be bought again)", () => {
    expect(describeSubscription(row({ status: "cancelled" }), NOW)).toMatchObject({
      state: "ending",
      paidUntil: "2026-12-20T00:00:00.000Z",
    })
  })

  it("uses the paid-until date, not Razorpay's later date", () => {
    const described = describeSubscription(
      row({ status: "cancelled", current_period_end: "2027-01-20T00:00:00.000Z" }),
      NOW,
    )
    expect(described?.paidUntil).toBe("2026-12-20T00:00:00.000Z")
  })

  it.each([
    ["nothing", null],
    ["a cancelled plan whose paid time is over", row({ status: "cancelled", paid_until: "2026-11-20T00:00:00.000Z" })],
    [
      "a plan cancelled while its payment was failing",
      row({ status: "cancelled", grace_ends_at: "2026-11-28T00:00:00.000Z" }),
    ],
    ["a failing payment (handled by Pay now)", row({ status: "halted" })],
    ["an unknown plan", row({ plan_id: "enterprise" })],
  ])("%s is not a current plan", (_label, input) => {
    expect(describeSubscription(input as never, NOW)).toBeNull()
  })
})

describe("paymentStatusLabel", () => {
  it("names paid, refunded and partly refunded payments", () => {
    expect(paymentStatusLabel({ status: "captured", amount_refunded_paise: 0 })).toBe("Paid")
    expect(paymentStatusLabel({ status: "refunded", amount_refunded_paise: 249900 })).toBe("Refunded")
    expect(paymentStatusLabel({ status: "partially_refunded", amount_refunded_paise: 100000 })).toBe(
      "Partly refunded (₹1,000)",
    )
  })
})
