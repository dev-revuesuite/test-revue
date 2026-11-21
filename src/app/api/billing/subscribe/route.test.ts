import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let currentUser: { id: string } | null = { id: "22222222-2222-4222-8222-222222222222" }
let adminConfigured = true
const startSubscription = vi.fn(async (input: unknown) => {
  void input
  return { subscriptionId: "sub_NEW", keyId: "rzp_test_PUBLIC", plan: "plus", cycle: "monthly" }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
  isAdminClientConfigured: () => adminConfigured,
}))
vi.mock("@/lib/billing/subscribe-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/subscribe-service")>()),
  startSubscription: (input: unknown) => startSubscription(input),
}))

import { POST } from "@/app/api/billing/subscribe/route"
import { BillingRequestError } from "@/lib/billing/subscribe-service"

const ORG = "11111111-1111-4111-8111-111111111111"
const ENV = {
  RAZORPAY_KEY_ID: "rzp_test_abc",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_PLAN_PLUS_MONTHLY: "plan_A1",
  RAZORPAY_PLAN_PLUS_ANNUAL: "plan_A2",
  RAZORPAY_PLAN_BUSINESS_MONTHLY: "plan_A3",
  RAZORPAY_PLAN_BUSINESS_ANNUAL: "plan_A4",
}

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/qc-tool/api/billing/subscribe", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  )

describe("POST /api/billing/subscribe", () => {
  beforeEach(() => {
    currentUser = { id: "22222222-2222-4222-8222-222222222222" }
    adminConfigured = true
    startSubscription.mockClear()
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
    vi.stubEnv("VERCEL_ENV", "")
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true")
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => vi.unstubAllEnvs())

  it("rejects a logged-out request", async () => {
    currentUser = null
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(401)
    expect(startSubscription).not.toHaveBeenCalled()
  })

  it.each([
    ["invalid JSON", "{oops"],
    ["an array", "[]"],
  ])("rejects %s", async (_label, body) => {
    expect((await post(body)).status).toBe(400)
  })

  it.each([
    ["missing", undefined],
    ["not a UUID", "org-1"],
    ["a SQL fragment", "' or 1=1 --"],
  ])("rejects an organization ID that is %s", async (_label, organizationId) => {
    const res = await post({ organizationId, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(400)
    expect(startSubscription).not.toHaveBeenCalled()
  })

  it("passes only the logged-in user's ID and the plan choice to the service", async () => {
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly", userId: "someone-else", amount: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ subscriptionId: "sub_NEW", keyId: "rzp_test_PUBLIC", plan: "plus", cycle: "monthly" })
    expect(startSubscription).toHaveBeenCalledWith({
      userId: "22222222-2222-4222-8222-222222222222",
      organizationId: ORG,
      body: { plan: "plus", cycle: "monthly" },
      replace: false,
    })
  })

  it("treats a plan switch as confirmed only when replace is exactly true", async () => {
    await post({ organizationId: ORG, plan: "business", cycle: "monthly", replace: "yes" })
    expect(startSubscription).toHaveBeenLastCalledWith(expect.objectContaining({ replace: false }))
    await post({ organizationId: ORG, plan: "business", cycle: "monthly", replace: true })
    expect(startSubscription).toHaveBeenLastCalledWith(expect.objectContaining({ replace: true }))
  })

  it("refuses checkout (503) where billing is switched off, even when called directly", async () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "")
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: "BILLING_DISABLED" })
    expect(startSubscription).not.toHaveBeenCalled()
  })

  it("answers 503 when billing env vars are missing", async () => {
    vi.stubEnv("RAZORPAY_KEY_SECRET", "")
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(503)
    expect(startSubscription).not.toHaveBeenCalled()
  })

  it("answers 503 when the service role is missing", async () => {
    adminConfigured = false
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(503)
  })

  it("maps service errors to status + code", async () => {
    startSubscription.mockRejectedValueOnce(new BillingRequestError(403, "NOT_OWNER", "Only the organization owner can change the plan."))
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Only the organization owner can change the plan.", code: "NOT_OWNER" })
  })

  it("hides unexpected internal errors", async () => {
    startSubscription.mockRejectedValueOnce(new Error("relation billing_secret does not exist"))
    const res = await post({ organizationId: ORG, plan: "plus", cycle: "monthly" })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain("billing_secret")
  })
})
