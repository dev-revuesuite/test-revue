import { afterEach, describe, expect, it, vi } from "vitest"

import { requestCheckout, waitForPaidPlan, CheckoutError } from "@/lib/billing/checkout-client"

const ORG = "11111111-1111-4111-8111-111111111111"

describe("requestCheckout", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("posts only the org and plan choice and returns the checkout details", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url
      void init
      return Response.json({ subscriptionId: "sub_1", keyId: "rzp_test_1", plan: "plus", cycle: "monthly" })
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(requestCheckout({ organizationId: ORG, plan: "plus", cycle: "monthly" })).resolves.toEqual({
      subscriptionId: "sub_1",
      keyId: "rzp_test_1",
      plan: "plus",
      cycle: "monthly",
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/qc-tool/api/billing/subscribe")
    expect(JSON.parse(String(init?.body))).toEqual({ organizationId: ORG, plan: "plus", cycle: "monthly" })
  })

  it("turns a server error into a readable CheckoutError with its code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Only the organization owner can change the plan.", code: "NOT_OWNER" }, { status: 403 })),
    )
    const error = await requestCheckout({ organizationId: ORG, plan: "plus", cycle: "monthly" }).catch((e) => e)
    expect(error).toBeInstanceOf(CheckoutError)
    expect(error).toMatchObject({ code: "NOT_OWNER", message: "Only the organization owner can change the plan." })
  })

  it("handles a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    }))
    await expect(requestCheckout({ organizationId: ORG, plan: "plus", cycle: "monthly" })).rejects.toMatchObject({
      code: "NETWORK",
    })
  })

  it("refuses a response without a valid subscription ID", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ subscriptionId: "nope", keyId: "rzp_test_1" })))
    await expect(requestCheckout({ organizationId: ORG, plan: "plus", cycle: "monthly" })).rejects.toBeInstanceOf(
      CheckoutError,
    )
  })
})

describe("waitForPaidPlan", () => {
  it("resolves true as soon as the webhook has switched the org to the plan", async () => {
    const readPlan = vi.fn().mockResolvedValueOnce("free").mockResolvedValueOnce("free").mockResolvedValueOnce("plus")
    const sleep = vi.fn(async () => {})
    await expect(waitForPaidPlan(readPlan, "plus", { attempts: 10, sleep })).resolves.toBe(true)
    expect(readPlan).toHaveBeenCalledTimes(3)
  })

  it("gives up (false) after the attempts run out, without throwing", async () => {
    const readPlan = vi.fn(async () => "free")
    const sleep = vi.fn(async () => {})
    await expect(waitForPaidPlan(readPlan, "plus", { attempts: 4, sleep })).resolves.toBe(false)
    expect(readPlan).toHaveBeenCalledTimes(4)
  })

  it("keeps trying when a read fails", async () => {
    const readPlan = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("plus")
    await expect(waitForPaidPlan(readPlan, "plus", { attempts: 3, sleep: async () => {} })).resolves.toBe(true)
  })

  it("does not accept a different plan than the one paid for", async () => {
    const readPlan = vi.fn(async () => "business")
    await expect(waitForPaidPlan(readPlan, "plus", { attempts: 2, sleep: async () => {} })).resolves.toBe(false)
  })
})
