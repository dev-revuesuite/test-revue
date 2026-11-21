import { createHmac } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { handleRazorpayWebhook, type WebhookDeps } from "@/lib/billing/webhook-service"

const SECRET = "whsec_unit_test"
const body = JSON.stringify({
  event: "subscription.activated",
  payload: {
    subscription: {
      entity: { id: "sub_A1", plan_id: "plan_P1", status: "active", current_start: 1763600000, current_end: 1766192000 },
    },
  },
  created_at: 1763600010,
})
const sign = (data: string, secret = SECRET) => createHmac("sha256", secret).update(data).digest("hex")

function deps(overrides: Partial<WebhookDeps> = {}) {
  const applyEvent = vi.fn(async () => ({ data: { result: "applied", plan: "granted" }, error: null }))
  return { applyEvent, deps: { secret: SECRET, applyEvent, ...overrides } as WebhookDeps }
}

const request = (overrides: Partial<{ rawBody: Buffer; signature: string | null; eventId: string | null }> = {}) => ({
  rawBody: Buffer.from(body),
  signature: sign(body),
  eventId: "evt_A1",
  ...overrides,
})

describe("handleRazorpayWebhook", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("applies a genuine event and answers 200", async () => {
    const { deps: d, applyEvent } = deps()
    const res = await handleRazorpayWebhook(request(), d)
    expect(res).toEqual({ status: 200, body: { ok: true, result: "applied" } })
    expect(applyEvent).toHaveBeenCalledTimes(1)
    const [event, payload] = applyEvent.mock.calls[0] as unknown as [Record<string, unknown>, unknown]
    expect(event).toMatchObject({ event_id: "evt_A1", event_type: "subscription.activated" })
    expect(payload).toEqual(JSON.parse(body))
  })

  it("rejects a fake signature without touching the database", async () => {
    const { deps: d, applyEvent } = deps()
    const res = await handleRazorpayWebhook(request({ signature: sign(body, "attacker") }), d)
    expect(res.status).toBe(400)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("rejects a missing signature without touching the database", async () => {
    const { deps: d, applyEvent } = deps()
    const res = await handleRazorpayWebhook(request({ signature: null }), d)
    expect(res.status).toBe(400)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("rejects a tampered body without touching the database", async () => {
    const { deps: d, applyEvent } = deps()
    const tampered = Buffer.from(body.replace("plan_P1", "plan_P2"))
    const res = await handleRazorpayWebhook(request({ rawBody: tampered }), d)
    expect(res.status).toBe(400)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("refuses everything (503) when the webhook secret is not set", async () => {
    const { deps: d, applyEvent } = deps({ secret: undefined })
    const res = await handleRazorpayWebhook(request(), d)
    expect(res.status).toBe(503)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("rejects a signed body that is not valid JSON", async () => {
    const { deps: d, applyEvent } = deps()
    const res = await handleRazorpayWebhook(request({ rawBody: Buffer.from("{oops"), signature: sign("{oops") }), d)
    expect(res.status).toBe(400)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("answers 200 (no retries) to a signed event it can't read, without applying it", async () => {
    const { deps: d, applyEvent } = deps()
    const res = await handleRazorpayWebhook(request({ eventId: null }), d)
    expect(res).toEqual({ status: 200, body: { ok: true, result: "unreadable" } })
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("answers 200 to a signed subscription event with an unexpected shape", async () => {
    const { deps: d, applyEvent } = deps()
    const odd = JSON.stringify({ event: "subscription.charged", payload: { subscription: { entity: { id: "weird" } } }, created_at: 1763600010 })
    const res = await handleRazorpayWebhook(request({ rawBody: Buffer.from(odd), signature: sign(odd) }), d)
    expect(res.status).toBe(200)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("rejects a body that is too large", async () => {
    const { deps: d, applyEvent } = deps()
    const big = JSON.stringify({ event: "x.y", created_at: 1, pad: "a".repeat(1_100_000) })
    const res = await handleRazorpayWebhook(request({ rawBody: Buffer.from(big), signature: sign(big) }), d)
    expect(res.status).toBe(413)
    expect(applyEvent).not.toHaveBeenCalled()
  })

  it("answers 500 on a database error, so Razorpay retries later", async () => {
    const { deps: d } = deps({
      applyEvent: vi.fn(async () => ({ data: null, error: { message: "connection lost" } })),
    })
    const res = await handleRazorpayWebhook(request(), d)
    expect(res.status).toBe(500)
  })

  it("answers 500 when the database call throws", async () => {
    const { deps: d } = deps({
      applyEvent: vi.fn(async () => {
        throw new Error("network down")
      }),
    })
    const res = await handleRazorpayWebhook(request(), d)
    expect(res.status).toBe(500)
  })

  it.each(["duplicate", "unknown_subscription", "plan_mismatch", "stale", "ignored"])(
    "answers 200 for a %s result (no point retrying)",
    async (result) => {
      const { deps: d } = deps({ applyEvent: vi.fn(async () => ({ data: { result }, error: null })) })
      const res = await handleRazorpayWebhook(request(), d)
      expect(res).toEqual({ status: 200, body: { ok: true, result } })
    },
  )

  it("never echoes internal details to the caller", async () => {
    const { deps: d } = deps({
      applyEvent: vi.fn(async () => ({ data: null, error: { message: "relation secret_table does not exist" } })),
    })
    const res = await handleRazorpayWebhook(request(), d)
    expect(JSON.stringify(res.body)).not.toContain("secret_table")
  })
})
