// Server only: the few Razorpay API calls billing needs.
// Uses the key secret (never sent to the browser). Every response is checked
// before we trust it.

export class RazorpayApiError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
    readonly razorpayCode?: string,
  ) {
    super(message)
    this.name = "RazorpayApiError"
  }
}

export type RazorpaySubscription = {
  id: string
  status: string
  planId: string
  /** Unix seconds; undefined until the first charge. */
  currentStart?: number
  currentEnd?: number
}

const SUB_ID = /^sub_[A-Za-z0-9]{1,64}$/
const TIMEOUT_MS = 15_000

export function createRazorpayApi(
  config: { keyId: string; keySecret: string },
  fetchImpl: typeof fetch = fetch,
  baseUrl = "https://api.razorpay.com/v1",
) {
  const authorization = `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`

  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    let res: Response
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      })
    } catch {
      throw new RazorpayApiError(0, "Razorpay is unreachable")
    }

    let json: unknown = null
    try {
      json = await res.json()
    } catch {
      // handled below
    }

    if (!res.ok) {
      const err = (json as { error?: { code?: unknown; description?: unknown } } | null)?.error
      const description =
        typeof err?.description === "string" ? err.description.slice(0, 200) : `Razorpay error ${res.status}`
      throw new RazorpayApiError(res.status, description, typeof err?.code === "string" ? err.code : undefined)
    }
    return json
  }

  function toSubscription(json: unknown): RazorpaySubscription {
    const j = json as
      | { id?: unknown; status?: unknown; plan_id?: unknown; current_start?: unknown; current_end?: unknown }
      | null
    if (!j || typeof j.id !== "string" || !SUB_ID.test(j.id) || typeof j.status !== "string" || typeof j.plan_id !== "string") {
      throw new RazorpayApiError(502, "Unexpected response from Razorpay")
    }
    return {
      id: j.id,
      status: j.status,
      planId: j.plan_id,
      currentStart: unixSeconds(j.current_start),
      currentEnd: unixSeconds(j.current_end),
    }
  }

  function safeId(id: string): string {
    if (typeof id !== "string" || !SUB_ID.test(id)) throw new RazorpayApiError(400, "Invalid subscription ID")
    return id
  }

  return {
    async createSubscription(input: {
      planId: string
      totalCount: number
      notes: Record<string, string>
    }): Promise<RazorpaySubscription> {
      const sub = toSubscription(
        await call("POST", "/subscriptions", {
          plan_id: input.planId,
          total_count: input.totalCount,
          quantity: 1,
          customer_notify: 1,
          notes: input.notes,
        }),
      )
      if (sub.planId !== input.planId) {
        throw new RazorpayApiError(502, "Razorpay created a subscription on an unexpected plan")
      }
      return sub
    },

    async fetchSubscription(id: string): Promise<RazorpaySubscription> {
      return toSubscription(await call("GET", `/subscriptions/${safeId(id)}`))
    },

    /**
     * Cancels a subscription. By default right away (unpaid checkouts, failing
     * payments); with `atCycleEnd` it keeps running until the paid period ends
     * and Razorpay cancels it then (no more charges either way).
     */
    async cancelSubscription(id: string, options: { atCycleEnd?: boolean } = {}): Promise<RazorpaySubscription> {
      return toSubscription(
        await call("POST", `/subscriptions/${safeId(id)}/cancel`, { cancel_at_cycle_end: options.atCycleEnd ? 1 : 0 }),
      )
    },

    /** Paid invoices of a subscription, newest first (one per successful charge). */
    async listPaidInvoices(subscriptionId: string): Promise<RazorpayPaidInvoice[]> {
      const json = (await call("GET", `/invoices?subscription_id=${safeId(subscriptionId)}&count=10`)) as {
        items?: unknown
      } | null
      if (!json || !Array.isArray(json.items)) throw new RazorpayApiError(502, "Unexpected response from Razorpay")
      const paid: RazorpayPaidInvoice[] = []
      for (const item of json.items as Record<string, unknown>[]) {
        if (
          item?.status === "paid" &&
          typeof item.payment_id === "string" &&
          PAY_ID.test(item.payment_id) &&
          typeof item.amount_paid === "number" &&
          Number.isSafeInteger(item.amount_paid) &&
          item.amount_paid >= 0 &&
          typeof item.currency === "string"
        ) {
          paid.push({
            invoiceId: typeof item.id === "string" && INV_ID.test(item.id) ? item.id : null,
            paymentId: item.payment_id,
            amount: item.amount_paid,
            currency: item.currency,
            paidAt: unixSeconds(item.paid_at) ?? null,
            billingEnd: unixSeconds(item.billing_end) ?? null,
          })
        }
      }
      return paid.sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))
    },

    /** Creates a one-time order (add-ons). The amount is in paise and chosen by our server. */
    async createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
      const order = toOrder(
        await call("POST", "/orders", {
          amount: input.amountPaise,
          currency: "INR",
          receipt: input.receipt,
          notes: input.notes,
        }),
      )
      if (order.amountPaise !== input.amountPaise) {
        throw new RazorpayApiError(502, "Razorpay created an order for an unexpected amount")
      }
      return order
    },

    async fetchOrder(orderId: string): Promise<RazorpayOrder> {
      return toOrder(await call("GET", `/orders/${safeOrderId(orderId)}`))
    },

    /** The captured payment of an order (its ID and amount in paise), or null if there is none yet. */
    async fetchCapturedOrderPayment(orderId: string): Promise<{ paymentId: string; amountPaise: number } | null> {
      const json = (await call("GET", `/orders/${safeOrderId(orderId)}/payments`)) as { items?: unknown } | null
      if (!json || !Array.isArray(json.items)) throw new RazorpayApiError(502, "Unexpected response from Razorpay")
      for (const item of json.items as Record<string, unknown>[]) {
        if (
          item?.status === "captured" &&
          typeof item.id === "string" &&
          PAY_ID.test(item.id) &&
          typeof item.amount === "number" &&
          Number.isSafeInteger(item.amount) &&
          item.amount > 0
        ) {
          return { paymentId: item.id, amountPaise: item.amount }
        }
      }
      return null
    },

    /**
     * Razorpay's hosted page for one invoice, or null if it has none. Only a
     * link on Razorpay's own domains is ever returned (the browser is
     * redirected to it).
     */
    async fetchInvoiceUrl(invoiceId: string): Promise<string | null> {
      if (typeof invoiceId !== "string" || !INV_ID.test(invoiceId)) throw new RazorpayApiError(400, "Invalid invoice ID")
      const json = (await call("GET", `/invoices/${invoiceId}`)) as { short_url?: unknown } | null
      const url = typeof json?.short_url === "string" ? json.short_url : ""
      try {
        const parsed = new URL(url)
        const host = parsed.hostname.toLowerCase()
        const trusted = host === "rzp.io" || host === "razorpay.com" || host.endsWith(".razorpay.com")
        return parsed.protocol === "https:" && trusted ? parsed.toString() : null
      } catch {
        return null
      }
    },
  }
}

export type RazorpayPaidInvoice = {
  invoiceId: string | null
  paymentId: string
  amount: number
  currency: string
  paidAt: number | null
  /** Unix seconds: end of the billing cycle this invoice paid for. */
  billingEnd: number | null
}

export type RazorpayOrder = {
  id: string
  /** "created" | "attempted" | "paid" */
  status: string
  amountPaise: number
  amountPaidPaise: number
}

const ORDER_ID = /^order_[A-Za-z0-9]{1,64}$/

function safeOrderId(id: string): string {
  if (typeof id !== "string" || !ORDER_ID.test(id)) throw new RazorpayApiError(400, "Invalid order ID")
  return id
}

function toOrder(json: unknown): RazorpayOrder {
  const j = json as { id?: unknown; status?: unknown; amount?: unknown; amount_paid?: unknown; currency?: unknown } | null
  if (
    !j ||
    typeof j.id !== "string" ||
    !ORDER_ID.test(j.id) ||
    typeof j.status !== "string" ||
    typeof j.amount !== "number" ||
    !Number.isSafeInteger(j.amount) ||
    j.amount <= 0 ||
    j.currency !== "INR"
  ) {
    throw new RazorpayApiError(502, "Unexpected response from Razorpay")
  }
  const paid = typeof j.amount_paid === "number" && Number.isSafeInteger(j.amount_paid) && j.amount_paid >= 0 ? j.amount_paid : 0
  return { id: j.id, status: j.status, amountPaise: j.amount, amountPaidPaise: paid }
}

const PAY_ID = /^pay_[A-Za-z0-9]{1,64}$/
const INV_ID = /^inv_[A-Za-z0-9]{1,64}$/

function unixSeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

export type RazorpayApi = ReturnType<typeof createRazorpayApi>
