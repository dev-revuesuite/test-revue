// Browser side of the checkout. Nothing here can unlock a plan: the browser only
// asks our server to start a checkout, opens Razorpay's pop-up, and then waits
// for the webhook to switch the org's plan (read back through RLS).

import { apiPath } from "@/lib/base-path"
import type { BillingCycle, PaidPlanId } from "@/lib/billing/billing-plans"

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"
const SUB_ID = /^sub_[A-Za-z0-9]{1,64}$/
const KEY_ID = /^rzp_(test|live)_[A-Za-z0-9]+$/

export class CheckoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "CheckoutError"
  }
}

export type CheckoutSession = { subscriptionId: string; keyId: string; plan: PaidPlanId; cycle: BillingCycle }

/** Asks our server to start a checkout (owner only; the server picks the plan). */
export async function requestCheckout(input: {
  organizationId: string
  plan: PaidPlanId
  cycle: BillingCycle
  /** The customer confirmed switching away from a plan that is still running. */
  replace?: boolean
}): Promise<CheckoutSession> {
  let res: Response
  try {
    res = await fetch(apiPath("/api/billing/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: input.organizationId,
        plan: input.plan,
        cycle: input.cycle,
        ...(input.replace ? { replace: true } : {}),
      }),
    })
  } catch {
    throw new CheckoutError("NETWORK", "You seem to be offline. Check your connection and try again.")
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) {
    throw new CheckoutError(
      typeof json?.code === "string" ? json.code : `HTTP_${res.status}`,
      typeof json?.error === "string" ? json.error : "Couldn't start the checkout. Please try again.",
    )
  }
  if (
    !json ||
    typeof json.subscriptionId !== "string" ||
    !SUB_ID.test(json.subscriptionId) ||
    typeof json.keyId !== "string" ||
    !KEY_ID.test(json.keyId)
  ) {
    throw new CheckoutError("BAD_RESPONSE", "Couldn't start the checkout. Please try again.")
  }
  return json as unknown as CheckoutSession
}

// --- Razorpay pop-up ---------------------------------------------------------

type RazorpayInstance = { open(): void; on(event: string, cb: (response: unknown) => void): void }
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

let scriptPromise: Promise<RazorpayConstructor> | null = null

/** Loads Razorpay's checkout.js once. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(window.Razorpay)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = RAZORPAY_SCRIPT
    script.async = true
    script.onload = () =>
      window.Razorpay
        ? resolve(window.Razorpay)
        : reject(new CheckoutError("SCRIPT", "The payment window couldn't load. Please try again."))
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new CheckoutError("SCRIPT", "The payment window couldn't load. Check your connection or ad blocker."))
    }
    document.body.appendChild(script)
  })
  return scriptPromise
}

export type CheckoutOutcome = "paid" | "dismissed"

/**
 * Opens the pop-up. Resolves "paid" when Razorpay reports success to the
 * browser, "dismissed" when the user closes it. A failed attempt stays inside
 * the pop-up (the user can retry there), so it isn't an outcome.
 */
export async function openCheckout(
  session: CheckoutSession,
  options: { planLabel: string; email?: string | null; name?: string | null },
): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpay()
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }
    const rzp = new Razorpay({
      key: session.keyId,
      subscription_id: session.subscriptionId,
      name: "Revue",
      description: options.planLabel,
      prefill: { email: options.email ?? undefined, name: options.name ?? undefined },
      theme: { color: "#5C6ECD" },
      handler: () => finish("paid"),
      modal: { ondismiss: () => finish("dismissed"), confirm_close: true },
    })
    rzp.open()
  })
}

// --- Add-ons (one-time payments) ----------------------------------------------

const ORDER_ID = /^order_[A-Za-z0-9]{1,64}$/

export type AddonOrder = { orderId: string; keyId: string; amountPaise: number }

/** Asks our server to start an add-on purchase (owner only; the server picks the price). */
export async function requestAddonOrder(input: { organizationId: string; item: string }): Promise<AddonOrder> {
  let res: Response
  try {
    res = await fetch(apiPath("/api/billing/addons"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: input.organizationId, item: input.item }),
    })
  } catch {
    throw new CheckoutError("NETWORK", "You seem to be offline. Check your connection and try again.")
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) {
    throw new CheckoutError(
      typeof json?.code === "string" ? json.code : `HTTP_${res.status}`,
      typeof json?.error === "string" ? json.error : "Couldn't start the purchase. Please try again.",
    )
  }
  if (
    !json ||
    typeof json.orderId !== "string" ||
    !ORDER_ID.test(json.orderId) ||
    typeof json.keyId !== "string" ||
    !KEY_ID.test(json.keyId) ||
    typeof json.amountPaise !== "number" ||
    !Number.isSafeInteger(json.amountPaise) ||
    json.amountPaise <= 0
  ) {
    throw new CheckoutError("BAD_RESPONSE", "Couldn't start the purchase. Please try again.")
  }
  return { orderId: json.orderId, keyId: json.keyId, amountPaise: json.amountPaise }
}

/** Opens Razorpay's window for a one-time order. Same outcomes as openCheckout. */
export async function openAddonCheckout(
  order: AddonOrder,
  options: { label: string; email?: string | null; name?: string | null },
): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpay()
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "Revue",
      description: options.label,
      prefill: { email: options.email ?? undefined, name: options.name ?? undefined },
      theme: { color: "#5C6ECD" },
      handler: () => finish("paid"),
      modal: { ondismiss: () => finish("dismissed"), confirm_close: true },
    })
    rzp.open()
  })
}

/**
 * Asks our server to check the order with Razorpay and add the purchase.
 * "granted" = added; "pending" = Razorpay hasn't confirmed the payment yet.
 */
export async function confirmAddon(orderId: string): Promise<"granted" | "pending"> {
  const res = await fetch(apiPath("/api/billing/addons/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  })
  const json = (await res.json().catch(() => null)) as { status?: unknown; error?: unknown; code?: unknown } | null
  if (!res.ok) {
    throw new CheckoutError(
      typeof json?.code === "string" ? json.code : `HTTP_${res.status}`,
      typeof json?.error === "string" ? json.error : "Couldn't check the payment.",
    )
  }
  return json?.status === "granted" ? "granted" : "pending"
}

/** Polls confirmAddon until the purchase is added. False if it takes longer than `attempts` tries. */
export async function waitForAddon(
  check: () => Promise<"granted" | "pending">,
  opts: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 10
  const interval = opts.intervalMs ?? 3000
  const wait = opts.sleep ?? sleep
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await check()) === "granted") return true
    } catch {
      // keep trying
    }
    if (i < attempts - 1) await wait(interval)
  }
  return false
}

// --- Confirming the payment ---------------------------------------------------

/**
 * Asks our server to check the subscription with Razorpay and update the plan
 * (owner only). Returns the subscription's status at Razorpay and this
 * workspace's plan ID afterwards.
 */
export async function syncBilling(
  organizationId: string,
): Promise<{ planId: string | null; status: string | null; subscriptionId: string | null }> {
  const res = await fetch(apiPath("/api/billing/sync"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })
  const json = (await res.json().catch(() => null)) as
    | { planId?: unknown; status?: unknown; subscriptionId?: unknown; error?: unknown; code?: unknown }
    | null
  if (!res.ok) {
    throw new CheckoutError(
      typeof json?.code === "string" ? json.code : `HTTP_${res.status}`,
      typeof json?.error === "string" ? json.error : "Couldn't check the payment.",
    )
  }
  return {
    planId: typeof json?.planId === "string" ? json.planId : null,
    status: typeof json?.status === "string" ? json.status : null,
    subscriptionId: typeof json?.subscriptionId === "string" ? json.subscriptionId : null,
  }
}

/** Cancels the owner's plan. Active plans keep working until the paid period ends. */
export async function requestCancel(organizationId: string): Promise<{ atPeriodEnd: boolean; endsAt: string | null }> {
  let res: Response
  try {
    res = await fetch(apiPath("/api/billing/cancel"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    })
  } catch {
    throw new CheckoutError("NETWORK", "You seem to be offline. Check your connection and try again.")
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) {
    throw new CheckoutError(
      typeof json?.code === "string" ? json.code : `HTTP_${res.status}`,
      typeof json?.error === "string" ? json.error : "Couldn't cancel the plan. Please try again.",
    )
  }
  return {
    atPeriodEnd: json?.atPeriodEnd === true,
    endsAt: typeof json?.endsAt === "string" ? json.endsAt : null,
  }
}

// --- Waiting for the plan to switch ------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/**
 * Polls until the org's plan is the one just paid for (set by the webhook or
 * by syncBilling). Returns false if it takes longer than `attempts` tries.
 */
export async function waitForPaidPlan(
  readPlanId: () => Promise<string | null>,
  plan: PaidPlanId,
  opts: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 30
  const interval = opts.intervalMs ?? 2000
  const wait = opts.sleep ?? sleep
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await readPlanId()) === plan) return true
    } catch {
      // keep trying
    }
    if (i < attempts - 1) await wait(interval)
  }
  return false
}
