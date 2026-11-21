// Server only: handles one Razorpay webhook call.
//
// Order matters: size check -> signature check -> parse -> validate -> apply in
// the database (one transaction, once per event ID). Nothing touches the
// database before the signature is verified.
//
// Status codes: 200 = done (including duplicates and events we ignore, so
// Razorpay stops sending them); 400/413 = bad request (never valid);
// 500/503 = our problem, Razorpay retries later.

import { verifyWebhookSignature } from "@/lib/billing/razorpay-signature"
import { isMissingDbFunctionError } from "@/lib/plans"
import {
  BillingWebhookError,
  normalizeWebhookEvent,
  type NormalizedWebhookEvent,
} from "@/lib/billing/webhook-event"

export const MAX_WEBHOOK_BYTES = 1_000_000

export type ApplyEventResult = {
  data: { result?: string } | null
  error: { message: string; code?: string | null } | null
}

export type WebhookDeps = {
  secret: string | undefined
  applyEvent: (event: NormalizedWebhookEvent, payload: unknown) => Promise<ApplyEventResult>
  /** Grants a paid add-on order (billing_apply_addon_payment). Without it, order.paid is ignored. */
  applyAddon?: (input: {
    orderId: string
    paymentId: string
    amountPaise: number
    eventId: string
    payload: unknown
  }) => Promise<ApplyEventResult>
}

const ORDER_ID = /^order_[A-Za-z0-9]{1,64}$/
const PAYMENT_ID = /^pay_[A-Za-z0-9]{1,64}$/
const EVENT_ID = /^[A-Za-z0-9_-]{1,100}$/

/**
 * The order, captured payment and amount from a signed "order.paid" event, or
 * null if this isn't one (or isn't in the expected shape: then it falls through
 * to the normal handling, which ignores it).
 */
function readPaidOrder(
  payload: unknown,
  eventId: string | null,
): { orderId: string; paymentId: string; amountPaise: number; eventId: string } | null {
  const body = payload as {
    event?: unknown
    payload?: { order?: { entity?: { id?: unknown } }; payment?: { entity?: { id?: unknown; amount?: unknown; status?: unknown } } }
  } | null
  if (!body || body.event !== "order.paid" || typeof eventId !== "string" || !EVENT_ID.test(eventId)) return null
  const orderId = body.payload?.order?.entity?.id
  const payment = body.payload?.payment?.entity
  if (typeof orderId !== "string" || !ORDER_ID.test(orderId)) return null
  if (!payment || typeof payment.id !== "string" || !PAYMENT_ID.test(payment.id) || payment.status !== "captured") return null
  if (typeof payment.amount !== "number" || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) return null
  return { orderId, paymentId: payment.id, amountPaise: payment.amount, eventId }
}

export type WebhookRequest = {
  rawBody: Uint8Array
  signature: string | null
  eventId: string | null
}

export type WebhookResponse = { status: number; body: Record<string, unknown> }

const LOG = "[billing-webhook]"

export async function handleRazorpayWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResponse> {
  if (!deps.secret) {
    console.error(LOG, "RAZORPAY_WEBHOOK_SECRET is not set; refusing all events")
    return { status: 503, body: { error: "Billing webhook is not configured" } }
  }

  if (req.rawBody.byteLength > MAX_WEBHOOK_BYTES) {
    return { status: 413, body: { error: "Payload too large" } }
  }

  if (!verifyWebhookSignature(req.rawBody, req.signature, deps.secret)) {
    console.warn(LOG, "Rejected a webhook with an invalid signature")
    return { status: 400, body: { error: "Invalid signature" } }
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(req.rawBody).toString("utf8"))
  } catch {
    console.error(LOG, "Rejected a signed webhook: invalid JSON")
    return { status: 400, body: { error: "Invalid event" } }
  }

  // A paid one-time order = an add-on purchase (granted only if the order is
  // one of ours and the amount matches; anything else is ignored there).
  const addon = deps.applyAddon ? readPaidOrder(payload, req.eventId) : null
  if (addon && deps.applyAddon) {
    try {
      const { data, error } = await deps.applyAddon({ ...addon, payload })
      if (error && isMissingDbFunctionError(error)) {
        // The add-ons migration isn't applied here, so this can't be an add-on
        // of ours (Razorpay also sends order.paid for subscription charges).
        // Answering 500 would make Razorpay retry and eventually switch the
        // whole webhook off, subscription events included.
        return { status: 200, body: { ok: true, result: "ignored" } }
      }
      if (error) {
        console.error(LOG, `Failed to apply order.paid ${addon.eventId}:`, error.message)
        return { status: 500, body: { error: "Could not process event" } }
      }
      return { status: 200, body: { ok: true, result: typeof data?.result === "string" ? data.result : "granted" } }
    } catch (error) {
      console.error(LOG, `Failed to apply order.paid ${addon.eventId}:`, error instanceof Error ? error.message : "unknown error")
      return { status: 500, body: { error: "Could not process event" } }
    }
  }

  let event: NormalizedWebhookEvent
  try {
    event = normalizeWebhookEvent(payload, req.eventId)
  } catch (error) {
    // Signed by Razorpay but not in a shape we expect. Answer 200 so Razorpay
    // doesn't keep retrying (and eventually disable the webhook); the daily
    // reconcile and the post-checkout sync read the real state from the API.
    const reason = error instanceof BillingWebhookError ? error.message : "unreadable event"
    console.error(LOG, "Ignored a signed webhook we couldn't read:", reason)
    return { status: 200, body: { ok: true, result: "unreadable" } }
  }

  try {
    const { data, error } = await deps.applyEvent(event, payload)
    if (error) {
      console.error(LOG, `Failed to apply ${event.event_type} ${event.event_id}:`, error.message)
      return { status: 500, body: { error: "Could not process event" } }
    }
    const result = typeof data?.result === "string" ? data.result : "applied"
    if (result !== "applied" && result !== "duplicate") {
      console.warn(LOG, `${event.event_type} ${event.event_id}: ${result}`)
    }
    return { status: 200, body: { ok: true, result } }
  } catch (error) {
    console.error(
      LOG,
      `Failed to apply ${event.event_type} ${event.event_id}:`,
      error instanceof Error ? error.message : "unknown error",
    )
    return { status: 500, body: { error: "Could not process event" } }
  }
}
