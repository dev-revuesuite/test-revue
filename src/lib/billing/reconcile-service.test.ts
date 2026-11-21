import { beforeEach, describe, expect, it, vi } from "vitest"

import { RazorpayApiError } from "@/lib/billing/razorpay-api"
import { runBillingReconcile, type ReconcileDeps } from "@/lib/billing/reconcile-service"

const NOW = new Date("2026-11-21T00:00:00.000Z")
const HOUR = 60 * 60 * 1000

type Row = Awaited<ReturnType<ReconcileDeps["listOpenSubscriptions"]>>[number]
const row = (over: Partial<Row>): Row => ({
  id: "row-" + (over.razorpay_subscription_id ?? "x"),
  razorpay_subscription_id: "sub_X",
  status: "active",
  created_at: new Date(NOW.getTime() - 10 * 24 * HOUR).toISOString(),
  ...over,
})

function setup(opts: { rows?: Row[]; owners?: string[]; remote?: Record<string, string> } = {}) {
  const deps = {
    listOpenSubscriptions: vi.fn(async () => opts.rows ?? []),
    listBillingOwners: vi.fn(async () => opts.owners ?? []),
    syncOwner: vi.fn(async () => "unchanged"),
    razorpay: {
      fetchSubscription: vi.fn(async (id: string) => ({ id, status: opts.remote?.[id] ?? "active", planId: "plan_PM", currentEnd: 1766239200 })),
      listPaidInvoices: vi.fn(async () => []),
      cancelSubscription: vi.fn(async (id: string) => ({ id, status: "cancelled", planId: "plan_PM" })),
    },
    applyEvent: vi.fn(async (event: unknown, payload: unknown) => {
      void event
      void payload
      return { data: { result: "applied" }, error: null }
    }),
    now: () => NOW,
  } satisfies ReconcileDeps
  return deps
}

describe("runBillingReconcile (daily)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("refreshes every live subscription from Razorpay (catches missed webhooks)", async () => {
    const deps = setup({ rows: [row({ razorpay_subscription_id: "sub_A" }), row({ razorpay_subscription_id: "sub_B", status: "pending" })] })
    const result = await runBillingReconcile(deps, { dryRun: false })
    expect(deps.razorpay.fetchSubscription).toHaveBeenCalledTimes(2)
    expect(deps.applyEvent).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ checked: 2, applied: 2, failed: 0 })
  })

  it("then re-checks every paying owner, which ends access after grace / the paid period", async () => {
    const deps = setup({ owners: ["owner-1", "owner-2"] })
    deps.syncOwner.mockResolvedValueOnce("revoked")
    const result = await runBillingReconcile(deps, { dryRun: false })
    expect(deps.syncOwner).toHaveBeenCalledWith("owner-1")
    expect(deps.syncOwner).toHaveBeenCalledWith("owner-2")
    expect(result).toMatchObject({ owners: 2, revoked: 1 })
  })

  it("cancels checkouts left unpaid for more than 2 days", async () => {
    const old = row({ razorpay_subscription_id: "sub_OLD", status: "created", created_at: new Date(NOW.getTime() - 49 * HOUR).toISOString() })
    const fresh = row({ razorpay_subscription_id: "sub_NEW", status: "created", created_at: new Date(NOW.getTime() - 2 * HOUR).toISOString() })
    const deps = setup({ rows: [old, fresh], remote: { sub_OLD: "created", sub_NEW: "created" } })
    const result = await runBillingReconcile(deps, { dryRun: false })
    expect(deps.razorpay.cancelSubscription).toHaveBeenCalledTimes(1)
    expect(deps.razorpay.cancelSubscription).toHaveBeenCalledWith("sub_OLD")
    // recorded through the normal path (never a direct status write)
    expect((deps.applyEvent.mock.calls[0][0] as { subscription: { id: string; status: string } }).subscription).toMatchObject({
      id: "sub_OLD",
      status: "cancelled",
    })
    expect(result).toMatchObject({ abandonedCancelled: 1 })
  })

  it("does not cancel an old 'created' row that Razorpay says was actually paid", async () => {
    const old = row({ razorpay_subscription_id: "sub_PAID", status: "created", created_at: new Date(NOW.getTime() - 72 * HOUR).toISOString() })
    const deps = setup({ rows: [old], remote: { sub_PAID: "active" } })
    await runBillingReconcile(deps, { dryRun: false })
    expect(deps.razorpay.cancelSubscription).not.toHaveBeenCalled()
    expect(deps.applyEvent).toHaveBeenCalledTimes(1)
  })

  it("dry run changes nothing", async () => {
    const old = row({ razorpay_subscription_id: "sub_OLD", status: "created", created_at: new Date(NOW.getTime() - 72 * HOUR).toISOString() })
    const deps = setup({ rows: [row({ razorpay_subscription_id: "sub_A" }), old], owners: ["owner-1"], remote: { sub_OLD: "created" } })
    const result = await runBillingReconcile(deps, { dryRun: true })
    expect(deps.applyEvent).not.toHaveBeenCalled()
    expect(deps.razorpay.cancelSubscription).not.toHaveBeenCalled()
    expect(deps.syncOwner).not.toHaveBeenCalled()
    expect(result).toMatchObject({ dryRun: true, checked: 2, abandonedCancelled: 1, owners: 1 })
  })

  it("one failing subscription doesn't stop the others", async () => {
    const deps = setup({ rows: [row({ razorpay_subscription_id: "sub_BAD" }), row({ razorpay_subscription_id: "sub_OK" })] })
    deps.razorpay.fetchSubscription.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    const result = await runBillingReconcile(deps, { dryRun: false })
    expect(result).toMatchObject({ checked: 2, applied: 1, failed: 1 })
    expect(deps.syncOwner).toHaveBeenCalledTimes(0) // no owners in this setup
  })

  it("one failing owner doesn't stop the others", async () => {
    const deps = setup({ owners: ["owner-1", "owner-2"] })
    deps.syncOwner.mockRejectedValueOnce(new Error("db"))
    const result = await runBillingReconcile(deps, { dryRun: false })
    expect(deps.syncOwner).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ owners: 2, failed: 1 })
  })
})
