// Server only: verifies that messages really come from Razorpay.
//
// Razorpay signs each message with HMAC-SHA256 (hex). We recompute it with our
// secret and compare in constant time. Anything unexpected returns false (never
// throws), and a missing secret rejects everything ("fail closed").

import { createHmac, timingSafeEqual } from "node:crypto"

const HEX_SHA256 = /^[0-9a-f]{64}$/

function hmacSha256(secret: string, data: string | Uint8Array): Buffer {
  return createHmac("sha256", secret).update(data).digest()
}

function matches(expected: Buffer, receivedHex: unknown): boolean {
  if (typeof receivedHex !== "string" || !HEX_SHA256.test(receivedHex)) return false
  return timingSafeEqual(expected, Buffer.from(receivedHex, "hex"))
}

/**
 * Webhook check. `rawBody` must be the request body exactly as received
 * (read it with `req.text()` or `req.arrayBuffer()` before any JSON parsing).
 * `signature` is the `X-Razorpay-Signature` header; `secret` is the webhook secret.
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  if (typeof rawBody !== "string" && !(rawBody instanceof Uint8Array)) return false
  return matches(hmacSha256(secret, rawBody), signature)
}

export type CheckoutResult = {
  paymentId: string
  subscriptionId: string
  signature: string | null | undefined
}

/**
 * Checks the result the Razorpay checkout pop-up hands to the browser
 * (`razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature`).
 * Used only to show "processing…" sooner: the webhook alone unlocks a plan.
 */
export function verifyCheckoutSignature(result: CheckoutResult, keySecret: string | undefined): boolean {
  if (!keySecret) return false
  const { paymentId, subscriptionId, signature } = result
  if (typeof paymentId !== "string" || typeof subscriptionId !== "string") return false
  if (!paymentId || !subscriptionId) return false
  // "|" is the separator; refusing it keeps the signed text unambiguous.
  if (paymentId.includes("|") || subscriptionId.includes("|")) return false
  return matches(hmacSha256(keySecret, `${paymentId}|${subscriptionId}`), signature)
}
