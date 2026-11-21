import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BillingConfig } from "@/lib/billing/billing-plans"
import { RazorpayApiError, type RazorpayApi } from "@/lib/billing/razorpay-api"
import {
  BillingRequestError,
  startSubscription,
  type OpenSubscription,
  type SubscribeStore,
} from "@/lib/billing/subscribe-service"

const CONFIG: BillingConfig = {
  keyId: "rzp_test_PUBLIC",
  keySecret: "never-returned",
  mode: "test",
  plans: {
    plus: { monthly: "plan_PM", annual: "plan_PA" },
    business: { monthly: "plan_BM", annual: "plan_BA" },
  },
}

const ORG = "11111111-1111-4111-8111-111111111111"
const OWNER = "22222222-2222-4222-8222-222222222222"

function setup(opts: {
  owner?: boolean
  planId?: string | null
  open?: OpenSubscription | null
  insert?: Awaited<ReturnType<SubscribeStore["insertSubscription"]>>
  remoteStatus?: string
  remoteEnd?: number
  cancelledEnd?: number
  fromBilling?: boolean
} = {}) {
  const store = {
    isOwner: vi.fn(async () => opts.owner ?? true),
    getOrgPlanId: vi.fn(async () => (opts.planId === undefined ? "free" : opts.planId)),
    isPlanFromBilling: vi.fn(async () => opts.fromBilling ?? false),
    getOpenSubscription: vi.fn(async () => opts.open ?? null),
    insertSubscription: vi.fn(async () => opts.insert ?? ({ ok: true } as const)),
  } satisfies SubscribeStore

  const razorpay = {
    createSubscription: vi.fn(async (input: { planId: string }) => ({
      id: "sub_NEW",
      status: "created",
      planId: input.planId,
    })),
    fetchSubscription: vi.fn(async (id: string) => ({
      id,
      status: opts.remoteStatus ?? "created",
      planId: opts.open?.razorpay_plan_id ?? "plan_PM",
      currentEnd: opts.remoteEnd,
    })),
    cancelSubscription: vi.fn(async (id: string) => ({ id, status: "cancelled", planId: "plan_PM", currentEnd: opts.cancelledEnd })),
    listPaidInvoices: vi.fn(async () => []),
  }
  const applyEvent = vi.fn(async (event: unknown, payload: unknown) => {
    void event
    void payload
    return { data: { result: "applied" }, error: null }
  })

  const run = (body: unknown, replace?: boolean) =>
    startSubscription(
      { userId: OWNER, organizationId: ORG, body, replace },
      { store, razorpay: razorpay as unknown as RazorpayApi, config: CONFIG, applyEvent },
    )
  return { store, razorpay, applyEvent, run }
}

const openSub = (over: Partial<OpenSubscription> = {}): OpenSubscription => ({
  id: "row-1",
  razorpay_subscription_id: "sub_OLD",
  razorpay_plan_id: "plan_PM",
  status: "created",
  ...over,
})

async function expectError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e) => e)
  expect(error).toBeInstanceOf(BillingRequestError)
  expect(error).toMatchObject({ status, code })
}

describe("startSubscription", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("happy path: creates a Razorpay subscription on the server-chosen plan and saves it as pending", async () => {
    const { run, razorpay, store } = setup()
    const result = await run({ plan: "plus", cycle: "monthly" })

    expect(result).toEqual({ subscriptionId: "sub_NEW", keyId: "rzp_test_PUBLIC", plan: "plus", cycle: "monthly" })
    expect(razorpay.createSubscription).toHaveBeenCalledWith({
      planId: "plan_PM",
      totalCount: 60,
      notes: { organization_id: ORG, created_by: OWNER },
    })
    expect(store.insertSubscription).toHaveBeenCalledWith({
      organization_id: ORG,
      razorpay_subscription_id: "sub_NEW",
      razorpay_plan_id: "plan_PM",
      plan_id: "plus",
      billing_cycle: "monthly",
      status: "created",
      created_by: OWNER,
    })
  })

  it("looks for an existing subscription on the owner's account, not just this workspace", async () => {
    const { run, store } = setup()
    await run({ plan: "plus", cycle: "monthly" })
    expect(store.getOpenSubscription).toHaveBeenCalledWith(OWNER)
  })

  it("uses 5 cycles for annual plans", async () => {
    const { run, razorpay } = setup()
    await run({ plan: "business", cycle: "annual" })
    expect(razorpay.createSubscription).toHaveBeenCalledWith(expect.objectContaining({ planId: "plan_BA", totalCount: 5 }))
  })

  it("never returns the key secret", async () => {
    const { run } = setup()
    expect(JSON.stringify(await run({ plan: "plus", cycle: "monthly" }))).not.toContain("never-returned")
  })

  it("ignores a price or plan ID sent by the browser", async () => {
    const { run, razorpay } = setup()
    await run({ plan: "plus", cycle: "monthly", amount: 1, plan_id: "plan_EVIL" })
    expect(razorpay.createSubscription).toHaveBeenCalledWith(expect.objectContaining({ planId: "plan_PM" }))
  })

  it("rejects an invalid plan before doing anything", async () => {
    const { run, razorpay, store } = setup()
    await expectError(run({ plan: "enterprise", cycle: "monthly" }), 400, "INVALID_PLAN")
    expect(store.isOwner).not.toHaveBeenCalled()
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("rejects anyone who is not the org owner (member, client, other org)", async () => {
    const { run, razorpay, store } = setup({ owner: false })
    await expectError(run({ plan: "plus", cycle: "monthly" }), 403, "NOT_OWNER")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
    expect(store.insertSubscription).not.toHaveBeenCalled()
  })

  it.each(["authenticated", "active", "paused"])(
    "a running (%s) plan is never replaced unless the customer confirmed the switch",
    async (status) => {
      const { run, razorpay } = setup({ open: openSub({ status }) })
      await expectError(run({ plan: "business", cycle: "monthly" }), 409, "ALREADY_SUBSCRIBED")
      expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
      expect(razorpay.createSubscription).not.toHaveBeenCalled()
    },
  )

  it("buying the plan you already have is refused, even with a confirmed switch", async () => {
    const { run, razorpay } = setup({ open: openSub({ status: "active" }) })
    await expectError(run({ plan: "plus", cycle: "monthly" }, true), 409, "SAME_PLAN")
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it.each([
    ["Plus to Business", { plan: "business", cycle: "monthly" }, "plan_BM"],
    ["monthly to annual", { plan: "plus", cycle: "annual" }, "plan_PA"],
  ])("confirmed switch (%s): cancels the running subscription first, then starts the new one", async (_label, body, planId) => {
    const { run, razorpay, applyEvent, store } = setup({ open: openSub({ status: "active" }) })
    const result = await run(body, true)
    expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_OLD")
    // the cancellation is recorded (keeps the paid period) before anything new exists
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
    expect(razorpay.cancelSubscription.mock.invocationCallOrder[0]).toBeLessThan(
      razorpay.createSubscription.mock.invocationCallOrder[0],
    )
    expect(razorpay.createSubscription).toHaveBeenCalledWith(expect.objectContaining({ planId }))
    expect(store.insertSubscription).toHaveBeenCalledTimes(1)
    expect(result.subscriptionId).toBe("sub_NEW")
  })

  it("switch: a subscription that already ended at Razorpay (missed webhook) is recorded, and the new plan starts", async () => {
    const { run, razorpay, applyEvent } = setup({ open: openSub({ status: "active" }), remoteStatus: "cancelled" })
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(400, "Subscription is not cancellable"))
    const result = await run({ plan: "business", cycle: "monthly" }, true)
    expect(razorpay.fetchSubscription).toHaveBeenCalledWith("sub_OLD")
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
    expect(result.subscriptionId).toBe("sub_NEW")
  })

  it("switch: if the cancel fails and the subscription is still running, nothing new is started", async () => {
    const { run, razorpay } = setup({ open: openSub({ status: "active" }), remoteStatus: "active" })
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(500, "try later"))
    await expectError(run({ plan: "business", cycle: "monthly" }, true), 502, "PAYMENT_PROVIDER_ERROR")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("switch: if cancelling the running subscription fails, nothing new is started", async () => {
    const { run, razorpay } = setup({ open: openSub({ status: "active" }) })
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    await expectError(run({ plan: "business", cycle: "monthly" }, true), 502, "PAYMENT_PROVIDER_ERROR")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("coming back early: a cancelled customer who still has paid time can subscribe again", async () => {
    const { run, razorpay } = setup({ planId: "plus", fromBilling: true })
    const result = await run({ plan: "business", cycle: "monthly" })
    expect(result.subscriptionId).toBe("sub_NEW")
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
  })

  it.each(["pending", "halted"])(
    "a failed renewal (%s) doesn't block buying again: the failing subscription is cancelled and replaced",
    async (status) => {
      const { run, razorpay, applyEvent, store } = setup({ open: openSub({ status }), remoteStatus: status })
      const result = await run({ plan: "business", cycle: "monthly" })
      expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_OLD")
      // the cancellation is recorded through the normal path before the new one is saved
      expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
      expect(result.subscriptionId).toBe("sub_NEW")
      expect(store.insertSubscription).toHaveBeenCalledTimes(1)
    },
  )

  it("a failed renewal that Razorpay collected in the meantime is recorded, and nothing new is started", async () => {
    const { run, razorpay, applyEvent } = setup({ open: openSub({ status: "halted" }), remoteStatus: "active" })
    await expectError(run({ plan: "plus", cycle: "monthly" }), 409, "ALREADY_SUBSCRIBED")
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("active")
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("if cancelling the failing subscription fails, nothing new is started", async () => {
    const { run, razorpay } = setup({ open: openSub({ status: "halted" }), remoteStatus: "halted" })
    razorpay.cancelSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    await expectError(run({ plan: "plus", cycle: "monthly" }), 502, "PAYMENT_PROVIDER_ERROR")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it.each(["plus", "business", "enterprise"])(
    "rejects an org whose paid plan (%s) was set by hand, not bought",
    async (planId) => {
      const { run, razorpay } = setup({ planId })
      await expectError(run({ plan: "plus", cycle: "monthly" }), 409, "PLAN_ACTIVE")
      expect(razorpay.createSubscription).not.toHaveBeenCalled()
    },
  )

  it("allows an org with no plan row (old org) to subscribe", async () => {
    const { run } = setup({ planId: null })
    await expect(run({ plan: "plus", cycle: "monthly" })).resolves.toMatchObject({ subscriptionId: "sub_NEW" })
  })

  it("reuses an unpaid checkout for the same plan instead of creating another", async () => {
    const { run, razorpay, store } = setup({ open: openSub() })
    const result = await run({ plan: "plus", cycle: "monthly" })
    expect(result.subscriptionId).toBe("sub_OLD")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
    expect(store.insertSubscription).not.toHaveBeenCalled()
  })

  it("cancels an unpaid checkout for a different plan, records it safely, then starts the new one", async () => {
    const { run, razorpay, applyEvent } = setup({ open: openSub({ razorpay_plan_id: "plan_PM" }) })
    const result = await run({ plan: "business", cycle: "monthly" })
    expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_OLD")
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("cancelled")
    expect(result.subscriptionId).toBe("sub_NEW")
  })

  it("race: if the old checkout was paid at the very moment it was cancelled, keeps the paid period and starts nothing new", async () => {
    const future = Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    const { run, razorpay, applyEvent } = setup({ open: openSub({ razorpay_plan_id: "plan_PM" }), cancelledEnd: future })
    await expectError(run({ plan: "business", cycle: "monthly" }), 409, "ALREADY_SUBSCRIBED")
    // recorded through the normal path, with its paid-until date
    const event = applyEvent.mock.calls[0][0] as { subscription: { status: string; current_end: string | null } }
    expect(event.subscription.status).toBe("cancelled")
    expect(event.subscription.current_end).toBe(new Date(future * 1000).toISOString())
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("if the 'unpaid' checkout was actually paid in another tab, records the payment and refuses a second one", async () => {
    const { run, razorpay, applyEvent } = setup({ open: openSub(), remoteStatus: "active" })
    await expectError(run({ plan: "business", cycle: "monthly" }), 409, "ALREADY_SUBSCRIBED")
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("active")
    expect(razorpay.cancelSubscription).not.toHaveBeenCalled()
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("if the old checkout expired at Razorpay, records that and starts a new one", async () => {
    const { run, applyEvent } = setup({ open: openSub(), remoteStatus: "expired" })
    const result = await run({ plan: "plus", cycle: "monthly" })
    expect((applyEvent.mock.calls[0][0] as { subscription: { status: string } }).subscription.status).toBe("expired")
    expect(result.subscriptionId).toBe("sub_NEW")
  })

  it("an ended subscription that is still paid up blocks buying again (no double charge)", async () => {
    const future = Math.floor(Date.now() / 1000) + 10 * 24 * 3600
    const { run, razorpay } = setup({ open: openSub(), remoteStatus: "cancelled", remoteEnd: future })
    await expectError(run({ plan: "plus", cycle: "monthly" }), 409, "ALREADY_SUBSCRIBED")
    expect(razorpay.createSubscription).not.toHaveBeenCalled()
  })

  it("double click: if another checkout was saved first, cancels ours at Razorpay", async () => {
    const { run, razorpay } = setup({ insert: { ok: false, conflict: true } })
    await expectError(run({ plan: "plus", cycle: "monthly" }), 409, "CHECKOUT_IN_PROGRESS")
    expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_NEW")
  })

  it("if saving fails, cancels the Razorpay subscription so nothing is left dangling", async () => {
    const { run, razorpay } = setup({ insert: { ok: false, conflict: false } })
    await expectError(run({ plan: "plus", cycle: "monthly" }), 500, "BILLING_SAVE_FAILED")
    expect(razorpay.cancelSubscription).toHaveBeenCalledWith("sub_NEW")
  })

  it("reports Razorpay being down as a 502", async () => {
    const { run, razorpay, store } = setup()
    razorpay.createSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "Razorpay is unreachable"))
    await expectError(run({ plan: "plus", cycle: "monthly" }), 502, "PAYMENT_PROVIDER_ERROR")
    expect(store.insertSubscription).not.toHaveBeenCalled()
  })
})
