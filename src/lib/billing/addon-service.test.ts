import { beforeEach, describe, expect, it, vi } from "vitest"

import { ADDON_ITEMS, findAddonItem } from "@/lib/billing/addon-catalog"
import {
  confirmAddonOrder,
  startAddonOrder,
  type AddonOrderRow,
  type AddonStore,
} from "@/lib/billing/addon-service"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { RazorpayApiError } from "@/lib/billing/razorpay-api"
import { handleRazorpayWebhook } from "@/lib/billing/webhook-service"
import { createHmac } from "node:crypto"

const ORG = "11111111-1111-4111-8111-111111111111"
const OWNER = "22222222-2222-4222-8222-222222222222"

function setup(
  opts: {
    owner?: boolean
    viewOnly?: boolean
    saved?: boolean
    order?: AddonOrderRow | null
    remote?: { status: string; amountPaidPaise: number }
    payment?: { paymentId: string; amountPaise: number } | null
    applyResult?: string
  } = {},
) {
  const store = {
    isOwner: vi.fn(async () => opts.owner ?? true),
    isViewOnly: vi.fn(async () => opts.viewOnly ?? false),
    insertOrder: vi.fn(async (row: Parameters<AddonStore["insertOrder"]>[0]) => {
      void row
      return opts.saved ?? true
    }),
    getOrder: vi.fn(async () =>
      opts.order === undefined
        ? { razorpay_order_id: "order_A1", amount_paise: 400000, status: "created", created_by: OWNER }
        : opts.order,
    ),
  } satisfies AddonStore
  const razorpay = {
    createOrder: vi.fn(async (input: { amountPaise: number }) => ({
      id: "order_NEW",
      status: "created",
      amountPaise: input.amountPaise,
      amountPaidPaise: 0,
    })),
    fetchOrder: vi.fn(async (id: string) => ({
      id,
      status: opts.remote?.status ?? "paid",
      amountPaise: 400000,
      amountPaidPaise: opts.remote?.amountPaidPaise ?? 400000,
    })),
    fetchCapturedOrderPayment: vi.fn(async () =>
      opts.payment === undefined ? { paymentId: "pay_A1", amountPaise: 400000 } : opts.payment,
    ),
  }
  const applyAddon = vi.fn(async (input: { orderId: string; paymentId: string; amountPaise: number; eventId: string }) => {
    void input
    return { data: { result: opts.applyResult ?? "granted" }, error: null }
  })
  const start = (itemId: unknown) =>
    startAddonOrder({ userId: OWNER, organizationId: ORG, itemId }, { store, razorpay, keyId: "rzp_test_PUBLIC" })
  const confirm = (userId = OWNER) => confirmAddonOrder({ userId, orderId: "order_A1" }, { store, razorpay, applyAddon })
  return { store, razorpay, applyAddon, start, confirm }
}

async function expectError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e) => e)
  expect(error).toBeInstanceOf(BillingRequestError)
  expect(error).toMatchObject({ status, code })
}

describe("add-on catalog", () => {
  it("has the six add-ons from the pricing sheet, at their prices", () => {
    expect(ADDON_ITEMS.map((i) => [i.id, i.priceInr])).toEqual([
      ["qc_100", 900],
      ["qc_500", 4000],
      ["qc_2000", 14000],
      ["storage_50", 400],
      ["storage_200", 1200],
      ["storage_1024", 4000],
    ])
  })

  it("knows nothing else", () => {
    expect(findAddonItem("qc_999999")).toBeNull()
    expect(findAddonItem({ id: "qc_100" })).toBeNull()
    expect(findAddonItem(undefined)).toBeNull()
  })
})

describe("startAddonOrder", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("creates a Razorpay order for the catalog price and saves it", async () => {
    const { start, razorpay, store } = setup()
    const result = await start("qc_500")
    expect(result).toMatchObject({ orderId: "order_NEW", keyId: "rzp_test_PUBLIC", amountPaise: 400000 })
    expect(razorpay.createOrder).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 400000 }))
    expect(store.insertOrder).toHaveBeenCalledWith({
      organization_id: ORG,
      created_by: OWNER,
      kind: "qc_pack",
      quantity: 500,
      amount_paise: 400000,
      razorpay_order_id: "order_NEW",
    })
  })

  it("the price can't come from the browser: anything but a known item ID is refused", async () => {
    const { start, razorpay } = setup()
    await expectError(start({ id: "qc_500", priceInr: 1 }), 400, "INVALID_ADDON")
    await expectError(start("qc_500_for_free"), 400, "INVALID_ADDON")
    expect(razorpay.createOrder).not.toHaveBeenCalled()
  })

  it("refuses anyone who is not the owner", async () => {
    const { start, razorpay } = setup({ owner: false })
    await expectError(start("storage_50"), 403, "NOT_OWNER")
    expect(razorpay.createOrder).not.toHaveBeenCalled()
  })

  it("doesn't sell extras to a view-only workspace (they couldn't be used)", async () => {
    const { start, razorpay } = setup({ viewOnly: true })
    await expectError(start("qc_100"), 409, "PLAN_REQUIRED")
    expect(razorpay.createOrder).not.toHaveBeenCalled()
  })

  it("reports Razorpay being down as 502 and saves nothing", async () => {
    const { start, razorpay, store } = setup()
    razorpay.createOrder.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    await expectError(start("qc_100"), 502, "PAYMENT_PROVIDER_ERROR")
    expect(store.insertOrder).not.toHaveBeenCalled()
  })

  it("if saving fails, the purchase doesn't start", async () => {
    const { start } = setup({ saved: false })
    await expectError(start("qc_100"), 500, "BILLING_SAVE_FAILED")
  })
})

describe("confirmAddonOrder", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("grants only after Razorpay says the order is paid, with Razorpay's payment and amount", async () => {
    const { confirm, applyAddon } = setup()
    await expect(confirm()).resolves.toMatchObject({ status: "granted" })
    expect(applyAddon).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_A1",
        paymentId: "pay_A1",
        amountPaise: 400000,
        eventId: expect.stringMatching(/^addon_sync_order_A1_\d{8}$/),
      }),
    )
  })

  it("'duplicate' is not 'added': a confirmation that was refused before stays not added", async () => {
    // First attempt was refused (e.g. amount mismatch); asking again answers "duplicate".
    const { confirm, store } = setup({ applyResult: "duplicate" })
    await expect(confirm()).resolves.toMatchObject({ status: "pending", result: "refused:duplicate" })
    // decided from the order row, which is still unpaid
    expect(store.getOrder).toHaveBeenCalledTimes(2)
  })

  it("'duplicate' counts as added only when the order row says it was paid", async () => {
    const { confirm, store } = setup({ applyResult: "duplicate" })
    store.getOrder
      .mockResolvedValueOnce({ razorpay_order_id: "order_A1", amount_paise: 400000, status: "created", created_by: OWNER })
      .mockResolvedValueOnce({ razorpay_order_id: "order_A1", amount_paise: 400000, status: "paid", created_by: OWNER })
    await expect(confirm()).resolves.toMatchObject({ status: "granted" })
  })

  it.each([
    ["not paid yet", { remote: { status: "attempted", amountPaidPaise: 0 } }],
    ["paid less than the price", { remote: { status: "paid", amountPaidPaise: 100 } }],
    ["no captured payment", { payment: null }],
  ])("grants nothing when the order is %s", async (_label, opts) => {
    const { confirm, applyAddon } = setup(opts)
    await expect(confirm()).resolves.toMatchObject({ status: "pending" })
    expect(applyAddon).not.toHaveBeenCalled()
  })

  it("someone else's order looks like it doesn't exist, and Razorpay is never asked", async () => {
    const { confirm, razorpay, applyAddon } = setup()
    await expectError(confirm("33333333-3333-4333-8333-333333333333"), 404, "ORDER_NOT_FOUND")
    expect(razorpay.fetchOrder).not.toHaveBeenCalled()
    expect(applyAddon).not.toHaveBeenCalled()
  })

  it("an unknown order is a 404", async () => {
    await expectError(setup({ order: null }).confirm(), 404, "ORDER_NOT_FOUND")
  })

  it("an order that is already added needs no second grant", async () => {
    const { confirm, razorpay, applyAddon } = setup({
      order: { razorpay_order_id: "order_A1", amount_paise: 400000, status: "paid", created_by: OWNER },
    })
    await expect(confirm()).resolves.toMatchObject({ status: "granted" })
    expect(razorpay.fetchOrder).not.toHaveBeenCalled()
    expect(applyAddon).not.toHaveBeenCalled()
  })

  it("a paid order the database refuses (e.g. amount mismatch) is not reported as added", async () => {
    await expect(setup({ applyResult: "amount_mismatch" }).confirm()).resolves.toMatchObject({
      status: "pending",
      result: "refused:amount_mismatch",
    })
  })

  it("reports Razorpay being down as 502", async () => {
    const { confirm, razorpay } = setup()
    razorpay.fetchOrder.mockRejectedValueOnce(new RazorpayApiError(0, "unreachable"))
    await expectError(confirm(), 502, "PAYMENT_PROVIDER_ERROR")
  })
})

describe("webhook: order.paid (add-ons)", () => {
  const SECRET = "whsec_test_addons"
  const sign = (raw: Uint8Array) => createHmac("sha256", SECRET).update(raw).digest("hex")
  const body = (over: Record<string, unknown> = {}) => ({
    event: "order.paid",
    created_at: 1795000000,
    payload: {
      order: { entity: { id: "order_A1", amount: 400000, amount_paid: 400000, status: "paid" } },
      payment: { entity: { id: "pay_A1", amount: 400000, status: "captured" } },
    },
    ...over,
  })

  function deps() {
    return {
      secret: SECRET,
      applyEvent: vi.fn(async () => ({ data: { result: "ignored" }, error: null })),
      applyAddon: vi.fn(async (input: { orderId: string; paymentId: string; amountPaise: number; eventId: string }) => {
        void input
        return { data: { result: "granted" }, error: null }
      }),
    }
  }

  const send = (payload: unknown, d: ReturnType<typeof deps>, signature?: string) => {
    const raw = new TextEncoder().encode(JSON.stringify(payload))
    return handleRazorpayWebhook({ rawBody: raw, signature: signature ?? sign(raw), eventId: "evt_addon_1" }, d)
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("a signed order.paid grants the add-on with the event's order, payment and amount", async () => {
    const d = deps()
    await expect(send(body(), d)).resolves.toMatchObject({ status: 200, body: { result: "granted" } })
    expect(d.applyAddon).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order_A1", paymentId: "pay_A1", amountPaise: 400000, eventId: "evt_addon_1" }),
    )
    expect(d.applyEvent).not.toHaveBeenCalled()
  })

  it("an unsigned order.paid grants nothing", async () => {
    const d = deps()
    await expect(send(body(), d, "0".repeat(64))).resolves.toMatchObject({ status: 400 })
    expect(d.applyAddon).not.toHaveBeenCalled()
  })

  it("an order.paid whose payment isn't captured is not treated as a purchase", async () => {
    const d = deps()
    const payload = body()
    ;(payload.payload.payment.entity as { status: string }).status = "failed"
    await send(payload, d)
    expect(d.applyAddon).not.toHaveBeenCalled()
  })

  it("before the add-ons migration (function missing) the event is ignored with 200, not failed", async () => {
    const d = deps()
    d.applyAddon.mockResolvedValueOnce({ data: null, error: { message: "no function", code: "PGRST202" } } as never)
    await expect(send(body(), d)).resolves.toMatchObject({ status: 200, body: { result: "ignored" } })
  })

  it("answers 500 when the grant fails, so Razorpay retries", async () => {
    const d = deps()
    d.applyAddon.mockResolvedValueOnce({ data: null, error: { message: "db down" } } as never)
    await expect(send(body(), d)).resolves.toMatchObject({ status: 500 })
  })
})
