import { createHmac } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn(async (name: string, args: unknown) => {
  void name
  void args
  return { data: { result: "applied" }, error: null }
})
let adminConfigured = true

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
  isAdminClientConfigured: () => adminConfigured,
}))

import { POST } from "@/app/api/billing/webhook/route"

const SECRET = "whsec_route_test"
// Includes non-ASCII text: the signature must be checked on the exact bytes.
const body = JSON.stringify({
  event: "subscription.activated",
  payload: {
    subscription: {
      entity: { id: "sub_R1", plan_id: "plan_R1", status: "active", notes: { org: "Café Ünïcode ✓" } },
    },
  },
  created_at: 1763600010,
})

const post = (headers: Record<string, string>, data: string = body) =>
  POST(new Request("http://localhost/qc-tool/api/billing/webhook", { method: "POST", body: data, headers }))

const sign = (data: string) => createHmac("sha256", SECRET).update(data).digest("hex")

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", SECRET)
    adminConfigured = true
    rpc.mockClear()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("verifies the exact raw bytes (non-ASCII body) and applies the event", async () => {
    const res = await post({ "x-razorpay-signature": sign(body), "x-razorpay-event-id": "evt_R1" })
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      "billing_apply_event",
      expect.objectContaining({ p_event: expect.objectContaining({ event_id: "evt_R1" }) }),
    )
  })

  it("rejects an unsigned request", async () => {
    const res = await post({ "x-razorpay-event-id": "evt_R2" })
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("refuses everything when the webhook secret is not set", async () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "  ")
    const res = await post({ "x-razorpay-signature": sign(body), "x-razorpay-event-id": "evt_R3" })
    expect(res.status).toBe(503)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("refuses everything when the service role is not configured", async () => {
    adminConfigured = false
    const res = await post({ "x-razorpay-signature": sign(body), "x-razorpay-event-id": "evt_R4" })
    expect(res.status).toBe(503)
    expect(rpc).not.toHaveBeenCalled()
  })
})
