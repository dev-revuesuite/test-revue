// Server only: turns a (signature-checked) Razorpay webhook body into the small,
// validated event that billing_apply_event() expects. Personal data (emails,
// phone numbers, card details) is dropped here; the raw body is stored separately
// in billing_events for debugging (server-only table).

export class BillingWebhookError extends Error {
  readonly status = 400
  constructor(message: string) {
    super(message)
    this.name = "BillingWebhookError"
  }
}

export const RAZORPAY_SUBSCRIPTION_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
  "cancelled",
  "completed",
  "expired",
] as const

export type NormalizedSubscription = {
  id: string
  plan_id: string
  status: (typeof RAZORPAY_SUBSCRIPTION_STATUSES)[number]
  current_start: string | null
  current_end: string | null
}

export type NormalizedPayment = {
  id: string
  amount: number
  amount_refunded: number
  currency: string
  status: string
  method: string | null
  invoice_id: string | null
  created_at: string | null
  /**
   * End of the billing cycle this payment paid for. Only set by checks against
   * Razorpay's API (from the paid invoice). Webhooks don't carry it: there the
   * database takes it from a subscription.charged event's cycle.
   */
  period_end?: string | null
}

export type NormalizedRefund = { id: string; payment_id: string; amount: number }

export type NormalizedWebhookEvent = {
  event_id: string
  event_type: string
  created_at: string
  subscription: NormalizedSubscription | null
  payment: NormalizedPayment | null
  refund: NormalizedRefund | null
}

const EVENT_ID = /^[A-Za-z0-9_-]{1,100}$/
// e.g. subscription.charged, payment.dispute.created
const EVENT_TYPE = /^[a-z_]+(\.[a-z_]+)+$/
const id = (prefix: string) => new RegExp(`^${prefix}_[A-Za-z0-9]{1,64}$`)
const SUB_ID = id("sub")
const PLAN_ID = id("plan")
const PAY_ID = id("pay")
const REFUND_ID = id("rfnd")
const INVOICE_ID = id("inv")

type Obj = Record<string, unknown>

const isObject = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const fail = (message: string): never => {
  throw new BillingWebhookError(message)
}

function entity(payload: Obj, key: string): Obj | null {
  const wrapper = payload[key]
  if (wrapper === undefined || wrapper === null) return null
  if (!isObject(wrapper) || !isObject(wrapper.entity)) return fail(`payload.${key} is malformed`)
  return wrapper.entity
}

function matching(value: unknown, pattern: RegExp, field: string): string {
  return typeof value === "string" && pattern.test(value) ? value : fail(`${field} is invalid`)
}

function amount(value: unknown, field: string): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fail(`${field} is invalid`)
}

/** Unix seconds -> ISO string. null/undefined -> null when allowed. */
function time(value: unknown, field: string, optional: boolean): string | null {
  if ((value === null || value === undefined) && optional) return null
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return fail(`${field} is invalid`)
  return new Date(value * 1000).toISOString()
}

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= 64 ? value : null

function subscription(e: Obj): NormalizedSubscription {
  const status = e.status
  if (!RAZORPAY_SUBSCRIPTION_STATUSES.includes(status as NormalizedSubscription["status"])) {
    fail("subscription.status is invalid")
  }
  return {
    id: matching(e.id, SUB_ID, "subscription.id"),
    plan_id: matching(e.plan_id, PLAN_ID, "subscription.plan_id"),
    status: status as NormalizedSubscription["status"],
    current_start: time(e.current_start, "subscription.current_start", true),
    current_end: time(e.current_end, "subscription.current_end", true),
  }
}

function payment(e: Obj): NormalizedPayment {
  return {
    id: matching(e.id, PAY_ID, "payment.id"),
    amount: amount(e.amount, "payment.amount"),
    amount_refunded: e.amount_refunded === undefined ? 0 : amount(e.amount_refunded, "payment.amount_refunded"),
    currency: matching(e.currency, /^[A-Z]{3}$/, "payment.currency"),
    status: matching(e.status, /^[a-z_]{1,32}$/, "payment.status"),
    method: optionalText(e.method),
    invoice_id: typeof e.invoice_id === "string" && INVOICE_ID.test(e.invoice_id) ? e.invoice_id : null,
    created_at: time(e.created_at, "payment.created_at", true),
  }
}

function refund(e: Obj): NormalizedRefund {
  return {
    id: matching(e.id, REFUND_ID, "refund.id"),
    payment_id: matching(e.payment_id, PAY_ID, "refund.payment_id"),
    amount: amount(e.amount, "refund.amount"),
  }
}

/**
 * `body` is the parsed JSON, `eventId` the `X-Razorpay-Event-Id` header.
 * Throws BillingWebhookError (400) for anything malformed.
 */
export function normalizeWebhookEvent(body: unknown, eventId: string | null | undefined): NormalizedWebhookEvent {
  if (typeof eventId !== "string" || !EVENT_ID.test(eventId)) fail("event ID is missing or invalid")
  if (!isObject(body)) return fail("body must be a JSON object")

  const eventType = matching(body.event, EVENT_TYPE, "event")
  const createdAt = time(body.created_at, "created_at", false) as string
  const payload = isObject(body.payload) ? body.payload : {}

  // Only the events billing acts on are read in detail. Anything else (e.g.
  // payment.dispute.created) passes through with no entities, so a payload
  // shape we don't know can never make a genuine event fail.
  const handled = eventType.startsWith("subscription.") || eventType.startsWith("refund.")
  if (!handled) {
    return { event_id: eventId as string, event_type: eventType, created_at: createdAt, subscription: null, payment: null, refund: null }
  }

  const subEntity = entity(payload, "subscription")
  const payEntity = entity(payload, "payment")
  const refundEntity = entity(payload, "refund")

  if (eventType.startsWith("subscription.") && !subEntity) fail("subscription event without a subscription")
  if (eventType.startsWith("refund.") && !refundEntity) fail("refund event without a refund")

  return {
    event_id: eventId as string,
    event_type: eventType,
    created_at: createdAt,
    subscription: subEntity ? subscription(subEntity) : null,
    payment: payEntity ? payment(payEntity) : null,
    refund: refundEntity ? refund(refundEntity) : null,
  }
}
