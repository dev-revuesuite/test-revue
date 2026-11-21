import { beforeEach, describe, expect, it, vi } from "vitest"

import { cancelPlan, type CancelStore } from "@/lib/billing/cancel-service"
import { RazorpayApiError, type RazorpayApi } from "@/lib/billing/razorpay-api"

const ORG = "11111111-1111-4111-8111-111111111111"
const OWNER = "22222222-2222-4222-8222-222222222222"
const NOW = new Date("2026-11-21T00:00:00.000Z")
const PAID_UNTIL = "2026-12-20T00:00:00.000Z"

function setup(
  opts: {
    owner?: boolean
    open?: Partial<NonNullable<Awaited<ReturnType<CancelStore["getOpenSubscription"]>>>> | null
    paidUntil?: string | null
  } = {},
) {
  const open =
    opts.open === null
      ? null
      : { id: "row-1", razorpay_subscription_id: "sub_C1", razorpay_plan_id: "plan_PM", status: "active", ...opts.open }
  const store = {
    isOwner: vi.fn(async () => opts.owner ?? true),
    getOpenSubscription: vi.fn(async () => open),
    getPaidUntil: vi.fn(async () => (opts.paidUntil === undefined ? PAID_UNTIL : opts.paidUntil)),
    endGraceNow: vi.fn(async (id: string) => {
      void id
    }),
  } satisfies CancelStore
  const razorpay = {
    cancelSubscription: vi.fn(async (id: string, o?: { atCycleEnd?: boolean }) => {
      void o
      return { id, status: "cancelled", planId: "plan_PM" }
    }),
    fetchSubscription: vi.fn(async (id: string) => ({ id, status: "cancelled", planId: "plan_PM" })),
    listPaidInvoices: vi.fn(async () => []),
  }
  const applyEvent = vi.fn(async (event: unknown, payload: unknown) => {
    void event
    void payload
    return { data: { result: "applied" }, error: null }
  })
  const run = () =>
    cancelPlan(
      { userId: OWNER, organizationId: ORG },
      { store, razorpay: razorpay as unknown as RazorpayApi, applyEvent, now: () => NOW },
    )
  return { store, razorpay, applyEvent, run }
}

describe("cancelPlan", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("cancels at Razorpay right away (no further charge possible) and keeps access until the paid cycle ends", async () => {
    const { run, razorpay, applyEvent } = setup()
    await expect(run()).resolves.toEqual({ atPeriodEnd: true, endsAt: PAID_UNTIL })
    // immediately: never Razorpay's "cancel at cycle end"
    expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_C1")
    // recorded through the normal path, from Razorpay's own answer (no second fetch)
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
    expect(razorpay.fetchSubscription).not.toHaveBeenCalled()
  })

  it("cancelling a paid, running plan doesn't touch any grace period", async () => {
    const { run, store } = setup()
    await run()
    expect(store.endGraceNow).not.toHaveBeenCalled()
  })

  it("looks up the owner's subscription (account plans)", async () => {
    const { run, store } = setup()
    await run()
    expect(store.getOpenSubscription).toHaveBeenCalledWith(OWNER)
  })

  it.each(["pending", "halted"])(
    "a %s subscription (renewal failed) ends access now, whatever dates are stored",
    async (status) => {
      const { run, razorpay, applyEvent, store } = setup({ open: { status }, paidUntil: "2027-01-20T00:00:00.000Z" })
      await expect(run()).resolves.toEqual({ atPeriodEnd: false, endsAt: null })
      expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_C1")
      expect(applyEvent).toHaveBeenCalled()
      // the owner cancelled: the 7-day grace ends with it (unlike "Pay now")
      expect(store.endGraceNow).toHaveBeenCalledWith("row-1")
    },
  )

  it.each([
    ["nothing was ever paid", null],
    ["the paid cycle is already over", "2026-11-20T00:00:00.000Z"],
  ])("ends access now when %s", async (_label, paidUntil) => {
    const { run } = setup({ open: { status: "authenticated" }, paidUntil })
    await expect(run()).resolves.toEqual({ atPeriodEnd: false, endsAt: null })
  })

  it("refuses anyone who is not the owner", async () => {
    const { run, razorpay } = setup({ owner: false })
    await expect(run()).rejects.toMatchObject({ status: 403, code: "NOT_OWNER" })
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
  })

  it.each([
    ["no subscription", null],
    ["only an unpaid checkout", { status: "created" }],
  ])("answers 404 when there is %s", async (_label, open) => {
    const { run, razorpay } = setup({ open })
    await expect(run()).rejects.toMatchObject({ status: 404, code: "NO_SUBSCRIPTION" })
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
  })

  it("reports Razorpay failing as 502 and records nothing", async () => {
    const { run, razorpay, applyEvent } = setup()
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    razorpay.fetchSubscription.mockResolvedValueOnce({ id: "sub_C1", status: "active", planId: "plan_PM" })
    await expect(run()).rejects.toMatchObject({ status: 502, code: "PAYMENT_PROVIDER_ERROR" })
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("never says 'cancelled' unless Razorpay says the subscription has ended", async () => {
    const { run, razorpay, applyEvent } = setup()
    razorpay.cancelSubscription.mockResolvedValueOnce({ id: "sub_C1", status: "active", planId: "plan_PM" })
    await expect(run()).rejects.toMatchObject({ status: 502, code: "PAYMENT_PROVIDER_ERROR" })
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("if it was already cancelled at Razorpay (missed webhook), records that and succeeds", async () => {
    const { run, razorpay, applyEvent } = setup()
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(400, "Subscription is not cancellable"))
    await expect(run()).resolves.toEqual({ atPeriodEnd: true, endsAt: PAID_UNTIL })
    expect(razorpay.fetchSubscription).toHaveBeenCalledWith("sub_C1")
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
  })

  it("still succeeds if updating our copy fails (Razorpay already cancelled; the webhook catches up)", async () => {
    const { run, applyEvent } = setup()
    applyEvent.mockResolvedValueOnce({ data: null, error: { message: "db down" } } as never)
    await expect(run()).resolves.toEqual({ atPeriodEnd: true, endsAt: PAID_UNTIL })
  })
})
