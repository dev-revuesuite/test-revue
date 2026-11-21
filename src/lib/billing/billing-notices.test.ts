import { beforeEach, describe, expect, it, vi } from "vitest"

import { createApplyEvent } from "@/lib/billing/apply-event"
import { buildNoticeEmail, emitBillingNotices, sendBillingNoticeEmails } from "@/lib/billing/billing-notices"
import type { NormalizedWebhookEvent } from "@/lib/billing/webhook-event"

type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>

function fakeAdmin(handlers: Record<string, Rpc>) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    const handler = handlers[name]
    if (!handler) return { data: null, error: { message: "no such function", code: "PGRST202" } }
    return handler(name, args)
  })
  return { admin: { rpc } as never, rpc }
}

const NOTICE = {
  id: "n1",
  kind: "payment_failed",
  email: "owner@example.com",
  title: "Your Plus payment failed",
  body: "Pay again by 28 Nov 2026.",
}

const event = (over: Partial<NormalizedWebhookEvent> = {}): NormalizedWebhookEvent => ({
  event_id: "evt_1",
  event_type: "subscription.charged",
  created_at: "2026-11-21T00:00:00.000Z",
  subscription: { id: "sub_A1", plan_id: "plan_PM", status: "active", current_start: null, current_end: null },
  payment: null,
  refund: null,
  ...over,
})

describe("billing notices", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("asks the database for one subscription's notices and returns how many were sent", async () => {
    const { admin, rpc } = fakeAdmin({ billing_emit_notices: async () => ({ data: 2, error: null }) })
    await expect(emitBillingNotices(admin, "sub_A1")).resolves.toBe(2)
    expect(rpc).toHaveBeenCalledWith("billing_emit_notices", { p_razorpay_subscription_id: "sub_A1" })
  })

  it("never throws: a missing function (before the migration) or a failure means no notices", async () => {
    await expect(emitBillingNotices(fakeAdmin({}).admin, "sub_A1")).resolves.toBe(0)
    const broken = fakeAdmin({
      billing_emit_notices: async () => {
        throw new Error("db down")
      },
    })
    await expect(emitBillingNotices(broken.admin)).resolves.toBe(0)
  })

  it("builds a plain email with what happened and a link to the plan page", () => {
    const email = buildNoticeEmail(NOTICE, "https://revuesuite.com/qc-tool/account?tab=plan")
    expect(email.subject).toBe("Your Plus payment failed")
    expect(email.text).toContain("Pay again by 28 Nov 2026.")
    expect(email.text).toContain("https://revuesuite.com/qc-tool/account?tab=plan")
  })

  it("sends each claimed email once and confirms it", async () => {
    const { admin, rpc } = fakeAdmin({
      billing_claim_notice_emails: async () => ({ data: [NOTICE], error: null }),
      billing_mark_notice_emailed: async () => ({ data: null, error: null }),
    })
    const send = vi.fn(async (message: { to: string; subject: string; text: string }) => {
      void message
      return true
    })
    await expect(sendBillingNoticeEmails(admin, send)).resolves.toEqual({ sent: 1, failed: 0 })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com", subject: NOTICE.title }))
    expect(rpc).toHaveBeenCalledWith("billing_mark_notice_emailed", { p_id: "n1" })
  })

  it("an email that fails is NOT confirmed, so the nightly job tries again", async () => {
    const { admin, rpc } = fakeAdmin({
      billing_claim_notice_emails: async () => ({ data: [NOTICE], error: null }),
      billing_mark_notice_emailed: async () => ({ data: null, error: null }),
    })
    await expect(sendBillingNoticeEmails(admin, async () => false)).resolves.toEqual({ sent: 0, failed: 1 })
    expect(rpc).not.toHaveBeenCalledWith("billing_mark_notice_emailed", expect.anything())
  })

  it("sending never throws", async () => {
    const broken = fakeAdmin({
      billing_claim_notice_emails: async () => {
        throw new Error("db down")
      },
    })
    await expect(sendBillingNoticeEmails(broken.admin, async () => true)).resolves.toEqual({ sent: 0, failed: 0 })
  })
})

describe("createApplyEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  const handlers = (): Record<string, Rpc> => ({
    billing_apply_event: async () => ({ data: { result: "applied" }, error: null }),
    billing_emit_notices: async () => ({ data: 1, error: null }),
  })

  it("applies the event, then updates that subscription's notices", async () => {
    const { admin, rpc } = fakeAdmin(handlers())
    await expect(createApplyEvent(admin, { notify: true })(event(), {})).resolves.toEqual({
      data: { result: "applied" },
      error: null,
    })
    expect(rpc.mock.calls.map((c) => c[0])).toEqual(["billing_apply_event", "billing_emit_notices"])
    expect(rpc).toHaveBeenLastCalledWith("billing_emit_notices", { p_razorpay_subscription_id: "sub_A1" })
  })

  it("without notify (bookkeeping while a checkout starts) sends no notices", async () => {
    const { admin, rpc } = fakeAdmin(handlers())
    await createApplyEvent(admin)(event(), {})
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it("a refund names no subscription, so all subscriptions are looked at", async () => {
    const { admin, rpc } = fakeAdmin(handlers())
    await createApplyEvent(admin, { notify: true })(event({ event_type: "refund.processed", subscription: null }), {})
    expect(rpc).toHaveBeenLastCalledWith("billing_emit_notices", { p_razorpay_subscription_id: null })
  })

  it("a failed event sends no notices, and a failing notice never fails the event", async () => {
    const failing = fakeAdmin({
      ...handlers(),
      billing_apply_event: async () => ({ data: null, error: { message: "boom" } }),
    })
    await expect(createApplyEvent(failing.admin, { notify: true })(event(), {})).resolves.toMatchObject({
      error: { message: "boom" },
    })
    expect(failing.rpc).toHaveBeenCalledTimes(1)

    const noisy = fakeAdmin({
      ...handlers(),
      billing_emit_notices: async () => {
        throw new Error("notice down")
      },
    })
    await expect(createApplyEvent(noisy.admin, { notify: true })(event(), {})).resolves.toMatchObject({ error: null })
  })
})
