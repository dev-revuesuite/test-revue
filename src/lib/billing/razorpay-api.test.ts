import { describe, expect, it, vi } from "vitest"

import { createRazorpayApi, RazorpayApiError } from "@/lib/billing/razorpay-api"

const CONFIG = { keyId: "rzp_test_KEY", keySecret: "SECRET123" }

function fakeFetch(status: number, json: unknown) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    void url
    void init
    return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } })
  })
}

describe("createRazorpayApi", () => {
  it("creates a subscription with basic auth and only the fields we choose", async () => {
    const fetchMock = fakeFetch(200, { id: "sub_NEW1", status: "created", plan_id: "plan_P1" })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)

    const sub = await api.createSubscription({
      planId: "plan_P1",
      totalCount: 60,
      notes: { organization_id: "org-1", created_by: "user-1" },
    })

    expect(sub).toEqual({ id: "sub_NEW1", status: "created", planId: "plan_P1" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.razorpay.com/v1/subscriptions")
    expect(init?.method).toBe("POST")
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("rzp_test_KEY:SECRET123").toString("base64")}`)
    expect(JSON.parse(String(init?.body))).toEqual({
      plan_id: "plan_P1",
      total_count: 60,
      quantity: 1,
      customer_notify: 1,
      notes: { organization_id: "org-1", created_by: "user-1" },
    })
  })

  it("refuses a created subscription on a different plan than asked", async () => {
    const api = createRazorpayApi(
      CONFIG,
      fakeFetch(200, { id: "sub_NEW1", status: "created", plan_id: "plan_OTHER" }) as unknown as typeof fetch,
    )
    await expect(api.createSubscription({ planId: "plan_P1", totalCount: 60, notes: {} })).rejects.toThrow(
      RazorpayApiError,
    )
  })

  it("refuses a malformed response", async () => {
    const api = createRazorpayApi(CONFIG, fakeFetch(200, { hello: "world" }) as unknown as typeof fetch)
    await expect(api.fetchSubscription("sub_A1")).rejects.toThrow(RazorpayApiError)
  })

  it("fetches and cancels by ID", async () => {
    const fetchMock = fakeFetch(200, { id: "sub_A1", status: "cancelled", plan_id: "plan_P1" })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
    await api.fetchSubscription("sub_A1")
    await api.cancelSubscription("sub_A1")
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.razorpay.com/v1/subscriptions/sub_A1")
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.razorpay.com/v1/subscriptions/sub_A1/cancel")
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ cancel_at_cycle_end: 0 })
  })

  it("can cancel at the end of the paid period", async () => {
    const fetchMock = fakeFetch(200, { id: "sub_A1", status: "active", plan_id: "plan_P1" })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
    await api.cancelSubscription("sub_A1", { atCycleEnd: true })
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ cancel_at_cycle_end: 1 })
  })

  it.each(["sub_A1/../../payments", "../orders", "", "pay_123"])(
    "refuses an unsafe subscription ID in the URL: %s",
    async (id) => {
      const fetchMock = fakeFetch(200, {})
      const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
      await expect(api.fetchSubscription(id)).rejects.toThrow(RazorpayApiError)
      await expect(api.cancelSubscription(id)).rejects.toThrow(RazorpayApiError)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it("returns the paid period from a fetched subscription", async () => {
    const api = createRazorpayApi(
      CONFIG,
      fakeFetch(200, {
        id: "sub_A1",
        status: "active",
        plan_id: "plan_P1",
        current_start: 1763647200,
        current_end: 1766239200,
      }) as unknown as typeof fetch,
    )
    await expect(api.fetchSubscription("sub_A1")).resolves.toEqual({
      id: "sub_A1",
      status: "active",
      planId: "plan_P1",
      currentStart: 1763647200,
      currentEnd: 1766239200,
    })
  })

  it("lists only valid paid invoices, newest first", async () => {
    const fetchMock = fakeFetch(200, {
      items: [
        { id: "inv_old", status: "paid", payment_id: "pay_old", amount_paid: 249900, currency: "INR", paid_at: 100 },
        { id: "inv_new", status: "paid", payment_id: "pay_new", amount_paid: 249900, currency: "INR", paid_at: 200, billing_end: 300 },
        { id: "inv_x", status: "issued", payment_id: null, amount_paid: 0, currency: "INR" },
        { id: "inv_bad", status: "paid", payment_id: "nope", amount_paid: 1, currency: "INR" },
        { id: "inv_frac", status: "paid", payment_id: "pay_frac", amount_paid: 1.5, currency: "INR" },
      ],
    })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
    await expect(api.listPaidInvoices("sub_A1")).resolves.toEqual([
      { invoiceId: "inv_new", paymentId: "pay_new", amount: 249900, currency: "INR", paidAt: 200, billingEnd: 300 },
      { invoiceId: "inv_old", paymentId: "pay_old", amount: 249900, currency: "INR", paidAt: 100, billingEnd: null },
    ])
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.razorpay.com/v1/invoices?subscription_id=sub_A1&count=10")
  })

  it("refuses an unsafe ID when listing invoices", async () => {
    const fetchMock = fakeFetch(200, { items: [] })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
    await expect(api.listPaidInvoices("sub_A1&count=1000")).rejects.toThrow(RazorpayApiError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("turns a Razorpay error into RazorpayApiError without the secret", async () => {
    const api = createRazorpayApi(
      CONFIG,
      fakeFetch(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } }) as unknown as typeof fetch,
    )
    const error = await api.fetchSubscription("sub_A1").catch((e) => e)
    expect(error).toBeInstanceOf(RazorpayApiError)
    expect(error).toMatchObject({ httpStatus: 400, razorpayCode: "BAD_REQUEST_ERROR" })
    expect(String(error.message)).not.toContain("SECRET123")
  })

  it("reports Razorpay being unreachable", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    const api = createRazorpayApi(CONFIG, fetchMock as unknown as typeof fetch)
    await expect(api.fetchSubscription("sub_A1")).rejects.toMatchObject({ httpStatus: 0 })
  })
})
