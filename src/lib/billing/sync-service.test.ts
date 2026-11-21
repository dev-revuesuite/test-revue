import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RazorpayApi } from "@/lib/billing/razorpay-api"
import { RazorpayApiError } from "@/lib/billing/razorpay-api"
import { BillingRequestError } from "@/lib/billing/subscribe-service"
import { syncSubscription, type SyncStore } from "@/lib/billing/sync-service"

const ORG = "11111111-1111-4111-8111-111111111111"
const OWNER = "22222222-2222-4222-8222-222222222222"
const NOW = new Date("2026-11-20T14:00:00.000Z")

function setup(opts: {
  owner?: boolean
  latest?: { id: string; razorpay_subscription_id: string; razorpay_plan_id: string; status: string } | null
  remote?: Partial<{ status: string; planId: string; currentStart: number; currentEnd: number }>
  invoices?: { invoiceId: string | null; paymentId: string; amount: number; currency: string; paidAt: number | null; billingEnd: number | null }[]
  applyResult?: { data: { result?: string } | null; error: { message: string } | null }
  planAfter?: string | null
} = {}) {
  const store = {
    isOwner: vi.fn(async () => opts.owner ?? true),
    getLatestSubscription: vi.fn(async () =>
      opts.latest === undefined
        ? { id: "row-1", razorpay_subscription_id: "sub_A1", razorpay_plan_id: "plan_PM", status: "created" }
        : opts.latest,
    ),
    getOrgPlanId: vi.fn(async () => (opts.planAfter === undefined ? "plus" : opts.planAfter)),
  } satisfies SyncStore

  const razorpay = {
    fetchSubscription: vi.fn(async (id: string) => ({
      id,
      status: "active",
      planId: "plan_PM",
      currentStart: 1763647200,
      currentEnd: 1766239200,
      ...opts.remote,
    })),
    listPaidInvoices: vi.fn(async () =>
      opts.invoices ?? [{ invoiceId: "inv_1", paymentId: "pay_1", amount: 249900, currency: "INR", paidAt: 1763647300, billingEnd: 1766239200 }],
    ),
  }
  const applyEvent = vi.fn(async (event: unknown, payload: unknown) => {
    void event
    void payload
    return opts.applyResult ?? { data: { result: "applied" }, error: null }
  })

  const run = () =>
    syncSubscription(
      { userId: OWNER, organizationId: ORG },
      { store, razorpay: razorpay as unknown as RazorpayApi, applyEvent, now: () => NOW },
    )
  return { store, razorpay, applyEvent, run }
}

describe("syncSubscription", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("asks Razorpay for the real status and applies it like a webhook (with the payment)", async () => {
    const { run, applyEvent, razorpay } = setup()
    await expect(run()).resolves.toEqual({ status: "active", result: "applied", planId: "plus", subscriptionId: "sub_A1" })

    expect(razorpay.fetchSubscription).toHaveBeenCalledWith("sub_A1")
    const [event] = applyEvent.mock.calls[0] as unknown as [Record<string, unknown>]
    expect(event).toEqual({
      event_id: "sync_sub_A1_active_1766239200_pay_1",
      event_type: "subscription.synced",
      created_at: "2026-11-20T14:00:00.000Z",
      subscription: {
        id: "sub_A1",
        plan_id: "plan_PM",
        status: "active",
        current_start: "2025-11-20T14:00:00.000Z",
        current_end: "2025-12-20T14:00:00.000Z",
      },
      payment: {
        id: "pay_1",
        amount: 249900,
        amount_refunded: 0,
        currency: "INR",
        status: "captured",
        method: null,
        invoice_id: "inv_1",
        created_at: "2025-11-20T14:01:40.000Z",
        period_end: "2025-12-20T14:00:00.000Z",
      },
      refund: null,
    })
  })

  it("'paid until' comes from the paid invoice, not from Razorpay's date (which may already be the next, unpaid cycle)", async () => {
    // Renewal invoice issued but not paid: current_end is one cycle ahead.
    const { run, applyEvent } = setup({ remote: { currentEnd: 1768917600 } })
    await run()
    const [event] = applyEvent.mock.calls[0] as unknown as [
      { subscription: { current_end: string }; payment: { period_end: string } },
    ]
    expect(event.subscription.current_end).toBe("2026-01-20T14:00:00.000Z")
    expect(event.payment.period_end).toBe("2025-12-20T14:00:00.000Z")
  })

  it("checks the owner's subscription (plans belong to the account)", async () => {
    const { run, store } = setup()
    await run()
    expect(store.getLatestSubscription).toHaveBeenCalledWith(OWNER)
  })

  it("uses the same event ID for the same state, so repeated syncs apply once", async () => {
    const a = setup()
    const b = setup()
    await a.run()
    await b.run()
    const id = (m: typeof a.applyEvent) => (m.mock.calls[0][0] as { event_id: string }).event_id
    expect(id(a.applyEvent)).toBe(id(b.applyEvent))
  })

  it("rejects anyone who is not the owner", async () => {
    const { run, razorpay } = setup({ owner: false })
    await expect(run()).rejects.toMatchObject({ status: 403, code: "NOT_OWNER" })
    expect(razorpay.fetchSubscription).not.toHaveBeenCalled()
  })

  it("does nothing when the org has no subscription", async () => {
    const { run, razorpay, applyEvent } = setup({ latest: null, planAfter: "free" })
    await expect(run()).resolves.toEqual({ status: null, result: "none", planId: "free", subscriptionId: null })
    expect(razorpay.fetchSubscription).not.toHaveBeenCalled()
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("does nothing while the checkout is still unpaid at Razorpay", async () => {
    const { run, applyEvent } = setup({ remote: { status: "created" }, planAfter: "free" })
    await expect(run()).resolves.toEqual({ status: "created", result: "unchanged", planId: "free", subscriptionId: "sub_A1" })
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("sends no payment when Razorpay has no paid invoice yet", async () => {
    const { run, applyEvent } = setup({ remote: { status: "authenticated" }, invoices: [] })
    await run()
    expect((applyEvent.mock.calls[0][0] as { payment: unknown }).payment).toBeNull()
  })

  it("passes Razorpay's plan ID through, so the database can refuse a mismatch", async () => {
    const { run, applyEvent } = setup({
      remote: { planId: "plan_OTHER" },
      applyResult: { data: { result: "plan_mismatch" }, error: null },
      planAfter: "free",
    })
    await expect(run()).resolves.toMatchObject({ result: "plan_mismatch", planId: "free" })
    expect((applyEvent.mock.calls[0][0] as { subscription: { plan_id: string } }).subscription.plan_id).toBe(
      "plan_OTHER",
    )
  })

  it("refuses an unknown status from Razorpay", async () => {
    const { run, applyEvent } = setup({ remote: { status: "weird" } })
    await expect(run()).rejects.toMatchObject({ status: 502 })
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("reports Razorpay being down as 502", async () => {
    const { run, razorpay } = setup()
    razorpay.fetchSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "Razorpay is unreachable"))
    await expect(run()).rejects.toMatchObject({ status: 502, code: "PAYMENT_PROVIDER_ERROR" })
  })

  it("reports a database error as 500", async () => {
    const { run } = setup({ applyResult: { data: null, error: { message: "boom" } } })
    const error = await run().catch((e) => e)
    expect(error).toBeInstanceOf(BillingRequestError)
    expect(error).toMatchObject({ status: 500 })
  })
})
