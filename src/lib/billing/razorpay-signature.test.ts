import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"

import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/billing/razorpay-signature"

const SECRET = "whsec_test_secret_123"
const BODY = JSON.stringify({
  event: "subscription.activated",
  payload: { subscription: { entity: { id: "sub_123", plan_id: "plan_abc" } } },
})

// Computed independently of the code under test.
const sign = (data: string, secret = SECRET) => createHmac("sha256", secret).update(data).digest("hex")

describe("verifyWebhookSignature", () => {
  it("matches the standard HMAC-SHA256 test vector", () => {
    expect(
      verifyWebhookSignature(
        "The quick brown fox jumps over the lazy dog",
        "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
        "key",
      ),
    ).toBe(true)
  })

  it("accepts a real signature", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it("accepts the raw body as bytes too", () => {
    expect(verifyWebhookSignature(Buffer.from(BODY, "utf8"), sign(BODY), SECRET)).toBe(true)
  })

  it("rejects a body changed by one character", () => {
    const tampered = BODY.replace("plan_abc", "plan_abd")
    expect(verifyWebhookSignature(tampered, sign(BODY), SECRET)).toBe(false)
  })

  it("rejects a body with extra whitespace", () => {
    expect(verifyWebhookSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false)
  })

  it("rejects a signature made with a different secret", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, "attacker_secret"), SECRET)).toBe(false)
  })

  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", ""],
    ["garbage", "not-a-signature"],
    ["too short", sign(BODY).slice(0, 63)],
    ["too long", `${sign(BODY)}0`],
    ["uppercase hex", sign(BODY).toUpperCase()],
    ["with spaces", ` ${sign(BODY)} `],
    ["non-hex of the right length", "z".repeat(64)],
  ])("rejects a %s signature without throwing", (_label, signature) => {
    expect(() => verifyWebhookSignature(BODY, signature, SECRET)).not.toThrow()
    expect(verifyWebhookSignature(BODY, signature, SECRET)).toBe(false)
  })

  it.each([
    ["undefined", undefined],
    ["empty", ""],
  ])("rejects everything when the server secret is %s", (_label, secret) => {
    // Even a signature made with an empty key must not pass.
    expect(verifyWebhookSignature(BODY, sign(BODY, ""), secret)).toBe(false)
  })

  it("rejects a non-string, non-bytes body", () => {
    expect(verifyWebhookSignature({ event: "x" } as unknown as string, sign("[object Object]"), SECRET)).toBe(false)
  })
})

describe("verifyCheckoutSignature", () => {
  const KEY_SECRET = "rzp_key_secret_456"
  const paymentId = "pay_ABC123"
  const subscriptionId = "sub_XYZ789"
  const signature = sign(`${paymentId}|${subscriptionId}`, KEY_SECRET)

  it("accepts a real checkout signature", () => {
    expect(verifyCheckoutSignature({ paymentId, subscriptionId, signature }, KEY_SECRET)).toBe(true)
  })

  it("rejects swapped payment and subscription IDs", () => {
    expect(
      verifyCheckoutSignature({ paymentId: subscriptionId, subscriptionId: paymentId, signature }, KEY_SECRET),
    ).toBe(false)
  })

  it("rejects a signature for a different subscription", () => {
    expect(
      verifyCheckoutSignature({ paymentId, subscriptionId: "sub_OTHER", signature }, KEY_SECRET),
    ).toBe(false)
  })

  it("rejects IDs containing the | separator (ambiguous input)", () => {
    const sneaky = sign(`pay_A|sub_B|sub_C`, KEY_SECRET)
    expect(
      verifyCheckoutSignature({ paymentId: "pay_A|sub_B", subscriptionId: "sub_C", signature: sneaky }, KEY_SECRET),
    ).toBe(false)
  })

  it.each([
    ["empty payment ID", { paymentId: "", subscriptionId, signature }],
    ["empty subscription ID", { paymentId, subscriptionId: "", signature }],
    ["missing signature", { paymentId, subscriptionId, signature: undefined }],
    ["non-string IDs", { paymentId: 123, subscriptionId, signature }],
  ])("rejects %s", (_label, input) => {
    expect(verifyCheckoutSignature(input as never, KEY_SECRET)).toBe(false)
  })

  it("rejects everything when the key secret is missing", () => {
    expect(verifyCheckoutSignature({ paymentId, subscriptionId, signature }, undefined)).toBe(false)
    expect(verifyCheckoutSignature({ paymentId, subscriptionId, signature }, "")).toBe(false)
  })
})
