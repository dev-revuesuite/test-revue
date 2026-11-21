// Server only: buying an add-on (QC pack or extra storage).
//
// start:   the owner picks an item -> the SERVER takes the price from its
//          catalog, creates a Razorpay order for that amount and saves it.
// confirm: after the payment window reports success, the server asks Razorpay
//          whether that order is really paid, and only then grants the add-on
//          through billing_apply_addon_payment (once per order, exact amount).
// The signed "order.paid" webhook and the nightly check use the same grant
// function, so a closed tab or a lost webhook never loses a paid add-on.
//
// Nothing the browser sends can change a price or grant anything.

import { addonAmountPaise, findAddonItem, type AddonItem } from "@/lib/billing/addon-catalog"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { RazorpayApiError, type RazorpayApi } from "@/lib/billing/razorpay-api"

export type AddonOrderRow = {
  razorpay_order_id: string
  amount_paise: number
  status: string
  created_by: string | null
}

export type AddonStore = {
  isOwner(organizationId: string, userId: string): Promise<boolean>
  /** True when the workspace is view-only (trial over, no plan): nothing bought could be used. */
  isViewOnly(organizationId: string): Promise<boolean>
  insertOrder(row: {
    organization_id: string
    created_by: string
    kind: AddonItem["kind"]
    quantity: number
    amount_paise: number
    razorpay_order_id: string
  }): Promise<boolean>
  getOrder(razorpayOrderId: string): Promise<AddonOrderRow | null>
}

export type ApplyAddonFn = (input: {
  orderId: string
  paymentId: string
  amountPaise: number
  eventId: string
  payload: unknown
}) => Promise<{ data: { result?: string } | null; error: { message: string; code?: string | null } | null }>

export type StartAddonResult = { orderId: string; keyId: string; amountPaise: number; item: AddonItem }

const LOG = "[billing-addon]"
const providerError = () =>
  new BillingRequestError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider isn't responding. Please try again.")

export async function startAddonOrder(
  input: { userId: string; organizationId: string; itemId: unknown },
  deps: { store: AddonStore; razorpay: Pick<RazorpayApi, "createOrder">; keyId: string },
): Promise<StartAddonResult> {
  const item = findAddonItem(input.itemId)
  if (!item) throw new BillingRequestError(400, "INVALID_ADDON", "Choose one of the listed add-ons.")

  if (!(await deps.store.isOwner(input.organizationId, input.userId))) {
    throw new BillingRequestError(403, "NOT_OWNER", "Only the organization owner can buy add-ons.")
  }
  if (await deps.store.isViewOnly(input.organizationId)) {
    throw new BillingRequestError(409, "PLAN_REQUIRED", "Your workspace is view-only. Choose a plan first, then add extras.")
  }

  const amountPaise = addonAmountPaise(item)
  let orderId: string
  try {
    const order = await deps.razorpay.createOrder({
      amountPaise,
      // Razorpay limits receipts to 40 characters.
      receipt: `addon_${item.id}_${Date.now()}`.slice(0, 40),
      notes: { organization_id: input.organizationId, created_by: input.userId, addon: item.id },
    })
    orderId = order.id
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error(LOG, "Creating the order failed:", error.httpStatus, error.razorpayCode ?? "", error.message)
      throw providerError()
    }
    throw error
  }

  const saved = await deps.store.insertOrder({
    organization_id: input.organizationId,
    created_by: input.userId,
    kind: item.kind,
    quantity: item.quantity,
    amount_paise: amountPaise,
    razorpay_order_id: orderId,
  })
  if (!saved) {
    // An unpaid Razorpay order needs no clean-up: without our row it can never grant anything.
    throw new BillingRequestError(500, "BILLING_SAVE_FAILED", "Couldn't start the purchase. Please try again.")
  }

  return { orderId, keyId: deps.keyId, amountPaise, item }
}

export type ConfirmAddonResult = { status: "granted" | "pending"; result: string }

/**
 * Asks Razorpay about one of our orders and grants it if it is really paid.
 * Shared by the buyer's confirm call and the nightly check (which has no user).
 */
export async function settleAddonOrder(
  order: Pick<AddonOrderRow, "razorpay_order_id" | "amount_paise" | "status">,
  deps: {
    store: Pick<AddonStore, "getOrder">
    razorpay: Pick<RazorpayApi, "fetchOrder" | "fetchCapturedOrderPayment">
    applyAddon: ApplyAddonFn
    now?: () => Date
  },
): Promise<ConfirmAddonResult> {
  if (order.status === "paid") return { status: "granted", result: "already_granted" }

  const remote = await deps.razorpay.fetchOrder(order.razorpay_order_id)
  if (remote.status !== "paid" || remote.amountPaidPaise < order.amount_paise) {
    return { status: "pending", result: "not_paid" }
  }
  const payment = await deps.razorpay.fetchCapturedOrderPayment(order.razorpay_order_id)
  if (!payment) return { status: "pending", result: "not_paid" }

  const { data, error } = await deps.applyAddon({
    orderId: order.razorpay_order_id,
    paymentId: payment.paymentId,
    amountPaise: payment.amountPaise,
    // One ID per order per day. Asking again the same day is a "duplicate"
    // (answered from the order row below); an attempt that could not grant
    // (e.g. the buyer had no workspace) is tried again the next day. Granting
    // itself is once per order in the database, whatever the event ID.
    eventId: `addon_sync_${order.razorpay_order_id}_${(deps.now?.() ?? new Date()).toISOString().slice(0, 10).replace(/-/g, "")}`,
    payload: { source: "sync", order: remote, payment },
  })
  if (error) {
    console.error(LOG, "Granting the add-on failed:", error.message)
    throw new BillingRequestError(500, "BILLING_SYNC_FAILED", "Couldn't add your purchase. Please try again.")
  }
  const result = typeof data?.result === "string" ? data.result : "unknown"
  let granted = result === "granted" || result === "already_granted"
  if (!granted && result === "duplicate") {
    // "duplicate" only says this confirmation was seen before, not what it did
    // (the earlier one may have been refused). The order row is the truth.
    granted = (await deps.store.getOrder(order.razorpay_order_id))?.status === "paid"
  }
  if (!granted) console.error(LOG, `Order ${order.razorpay_order_id} is paid but was not added: ${result}`)
  // "refused" = Razorpay has the money but we could not add the purchase
  // (wrong amount, no workspace...). Never reported as added; needs a person.
  return { status: granted ? "granted" : "pending", result: granted ? result : `refused:${result}` }
}

export async function confirmAddonOrder(
  input: { userId: string; orderId: string },
  deps: {
    store: Pick<AddonStore, "getOrder">
    razorpay: Pick<RazorpayApi, "fetchOrder" | "fetchCapturedOrderPayment">
    applyAddon: ApplyAddonFn
  },
): Promise<ConfirmAddonResult> {
  const order = await deps.store.getOrder(input.orderId)
  // Same answer for "not found" and "someone else's": no hints about other orders.
  if (!order || order.created_by !== input.userId) {
    throw new BillingRequestError(404, "ORDER_NOT_FOUND", "We couldn't find that purchase.")
  }
  try {
    return await settleAddonOrder(order, deps)
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error(LOG, "Razorpay call failed:", error.httpStatus, error.razorpayCode ?? "", error.message)
      throw providerError()
    }
    throw error
  }
}
