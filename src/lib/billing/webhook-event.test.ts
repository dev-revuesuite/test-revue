import { describe, expect, it } from "vitest"

import { BillingWebhookError, normalizeWebhookEvent } from "@/lib/billing/webhook-event"

const subscriptionEntity = {
  id: "sub_ABC123",
  entity: "subscription",
  plan_id: "plan_PLUSM01",
  status: "active",
  current_start: 1763600000,
  current_end: 1766192000,
  customer_email: "someone@example.com",
}

const paymentEntity = {
  id: "pay_XYZ789",
  entity: "payment",
  amount: 249900,
  amount_refunded: 0,
  currency: "INR",
  status: "captured",
  method: "upi",
  invoice_id: "inv_111",
  created_at: 1763600005,
  email: "someone@example.com",
}

const charged = {
  entity: "event",
  event: "subscription.charged",
  contains: ["subscription", "payment"],
  payload: { subscription: { entity: subscriptionEntity }, payment: { entity: paymentEntity } },
  created_at: 1763600010,
}

describe("normalizeWebhookEvent", () => {
  it("turns a subscription.charged body into the event the database expects", () => {
    expect(normalizeWebhookEvent(charged, "evt_001")).toEqual({
      event_id: "evt_001",
      event_type: "subscription.charged",
      created_at: "2025-11-20T00:53:30.000Z",
      subscription: {
        id: "sub_ABC123",
        plan_id: "plan_PLUSM01",
        status: "active",
        current_start: "2025-11-20T00:53:20.000Z",
        current_end: "2025-12-20T00:53:20.000Z",
      },
      payment: {
        id: "pay_XYZ789",
        amount: 249900,
        amount_refunded: 0,
        currency: "INR",
        status: "captured",
        method: "upi",
        invoice_id: "inv_111",
        created_at: "2025-11-20T00:53:25.000Z",
      },
      refund: null,
    })
  })

  it("drops personal data (emails etc.) from the normalized event", () => {
    const json = JSON.stringify(normalizeWebhookEvent(charged, "evt_001"))
    expect(json).not.toContain("someone@example.com")
  })

  it("handles a subscription event without a payment", () => {
    const event = normalizeWebhookEvent(
      {
        event: "subscription.pending",
        payload: { subscription: { entity: { ...subscriptionEntity, status: "pending", current_start: null } } },
        created_at: 1763600010,
      },
      "evt_002",
    )
    expect(event.subscription).toMatchObject({ status: "pending", current_start: null })
    expect(event.payment).toBeNull()
  })

  it("handles refund.processed", () => {
    const event = normalizeWebhookEvent(
      {
        event: "refund.processed",
        payload: {
          refund: { entity: { id: "rfnd_1", payment_id: "pay_XYZ789", amount: 100000 } },
          payment: { entity: { ...paymentEntity, amount_refunded: 100000, status: "refunded" } },
        },
        created_at: 1763600010,
      },
      "evt_003",
    )
    expect(event.refund).toEqual({ id: "rfnd_1", payment_id: "pay_XYZ789", amount: 100000 })
    expect(event.payment?.amount_refunded).toBe(100000)
    expect(event.subscription).toBeNull()
  })

  it("accepts event names with several dots and ignores their payload shape", () => {
    const event = normalizeWebhookEvent(
      { event: "payment.dispute.created", payload: { payment: { entity: { id: 123, amount: "x" } } }, created_at: 1763600010 },
      "evt_010",
    )
    expect(event).toMatchObject({ event_type: "payment.dispute.created", subscription: null, payment: null, refund: null })
  })

  it("passes other event types through so the database can ignore them", () => {
    const event = normalizeWebhookEvent({ event: "order.paid", payload: {}, created_at: 1763600010 }, "evt_004")
    expect(event).toMatchObject({ event_type: "order.paid", subscription: null, payment: null, refund: null })
  })

  it.each([
    ["missing", null],
    ["empty", ""],
    ["too long", `evt_${"a".repeat(200)}`],
    ["odd characters", "evt_1; drop table"],
  ])("rejects a %s event ID", (_label, id) => {
    expect(() => normalizeWebhookEvent(charged, id)).toThrow(BillingWebhookError)
  })

  it.each([
    ["not an object", "hello"],
    ["array", []],
    ["no event type", { ...charged, event: undefined }],
    ["bad event type", { ...charged, event: "Subscription Charged" }],
    ["no created_at", { ...charged, created_at: undefined }],
    ["text created_at", { ...charged, created_at: "yesterday" }],
    ["negative created_at", { ...charged, created_at: -1 }],
  ])("rejects a body with %s", (_label, body) => {
    expect(() => normalizeWebhookEvent(body, "evt_005")).toThrow(BillingWebhookError)
  })

  it.each([
    ["bad subscription ID", { id: "abc" }],
    ["bad plan ID", { plan_id: "PLUS" }],
    ["unknown status", { status: "paid" }],
    ["text period end", { current_end: "soon" }],
  ])("rejects a subscription with a %s", (_label, change) => {
    const body = { ...charged, payload: { ...charged.payload, subscription: { entity: { ...subscriptionEntity, ...change } } } }
    expect(() => normalizeWebhookEvent(body, "evt_006")).toThrow(BillingWebhookError)
  })

  it("rejects a subscription event that has no subscription in it", () => {
    expect(() =>
      normalizeWebhookEvent({ event: "subscription.activated", payload: {}, created_at: 1763600010 }, "evt_007"),
    ).toThrow(BillingWebhookError)
  })

  it.each([
    ["bad payment ID", { id: "123" }],
    ["fractional amount", { amount: 2499.5 }],
    ["negative amount", { amount: -1 }],
    ["text amount", { amount: "249900" }],
    ["missing currency", { currency: undefined }],
  ])("rejects a payment with a %s", (_label, change) => {
    const body = { ...charged, payload: { ...charged.payload, payment: { entity: { ...paymentEntity, ...change } } } }
    expect(() => normalizeWebhookEvent(body, "evt_008")).toThrow(BillingWebhookError)
  })

  it("rejects a refund with a bad payment ID", () => {
    expect(() =>
      normalizeWebhookEvent(
        {
          event: "refund.processed",
          payload: { refund: { entity: { id: "rfnd_1", payment_id: "nope", amount: 1 } } },
          created_at: 1763600010,
        },
        "evt_009",
      ),
    ).toThrow(BillingWebhookError)
  })
})
