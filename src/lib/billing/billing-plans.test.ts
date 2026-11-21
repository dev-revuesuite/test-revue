import { describe, expect, it } from "vitest"

import {
  BillingConfigError,
  BillingInputError,
  getBillingConfig,
  parsePlanChoice,
  planForRazorpayPlanId,
  razorpayPlanIdFor,
} from "@/lib/billing/billing-plans"

const PLAN_IDS = {
  RAZORPAY_PLAN_PLUS_MONTHLY: "plan_PlusMonthly01",
  RAZORPAY_PLAN_PLUS_ANNUAL: "plan_PlusAnnual01",
  RAZORPAY_PLAN_BUSINESS_MONTHLY: "plan_BizMonthly01",
  RAZORPAY_PLAN_BUSINESS_ANNUAL: "plan_BizAnnual01",
}

const testEnv = (overrides: Record<string, string | undefined> = {}) => ({
  RAZORPAY_KEY_ID: "rzp_test_abc123",
  RAZORPAY_KEY_SECRET: "secret_xyz",
  ...PLAN_IDS,
  ...overrides,
})

describe("parsePlanChoice", () => {
  it.each([
    ["plus", "monthly"],
    ["plus", "annual"],
    ["business", "monthly"],
    ["business", "annual"],
  ])("accepts %s / %s", (plan, cycle) => {
    expect(parsePlanChoice({ plan, cycle })).toEqual({ plan, cycle })
  })

  it.each([
    ["free plan", { plan: "free", cycle: "monthly" }],
    ["enterprise plan", { plan: "enterprise", cycle: "monthly" }],
    ["made-up plan", { plan: "platinum", cycle: "monthly" }],
    ["wrong cycle", { plan: "plus", cycle: "weekly" }],
    ["uppercase", { plan: "PLUS", cycle: "monthly" }],
    ["trailing space", { plan: "plus ", cycle: "monthly" }],
    ["prototype key", { plan: "__proto__", cycle: "monthly" }],
    ["inherited key", { plan: "toString", cycle: "monthly" }],
    ["missing cycle", { plan: "plus" }],
    ["number", { plan: 1, cycle: "monthly" }],
    ["null", null],
    ["string", "plus"],
    ["array", ["plus", "monthly"]],
  ])("rejects %s", (_label, input) => {
    expect(() => parsePlanChoice(input)).toThrow(BillingInputError)
  })

  it("ignores any price the browser sends", () => {
    expect(parsePlanChoice({ plan: "plus", cycle: "monthly", amount: 1, plan_id: "plan_evil" })).toEqual({
      plan: "plus",
      cycle: "monthly",
    })
  })

  it("marks input errors as 400 with a code", () => {
    try {
      parsePlanChoice({ plan: "free", cycle: "monthly" })
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({ status: 400, code: "INVALID_PLAN" })
    }
  })
})

describe("getBillingConfig", () => {
  it("reads keys and all 4 plan IDs from the server env", () => {
    const config = getBillingConfig(testEnv())
    expect(config.keyId).toBe("rzp_test_abc123")
    expect(config.keySecret).toBe("secret_xyz")
    expect(config.mode).toBe("test")
    expect(config.plans).toEqual({
      plus: { monthly: "plan_PlusMonthly01", annual: "plan_PlusAnnual01" },
      business: { monthly: "plan_BizMonthly01", annual: "plan_BizAnnual01" },
    })
  })

  it("trims stray whitespace and quotes from env values", () => {
    const config = getBillingConfig(testEnv({ RAZORPAY_PLAN_PLUS_MONTHLY: ' "plan_PlusMonthly01"\r' }))
    expect(config.plans.plus.monthly).toBe("plan_PlusMonthly01")
  })

  it.each([
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_PLAN_PLUS_MONTHLY",
    "RAZORPAY_PLAN_PLUS_ANNUAL",
    "RAZORPAY_PLAN_BUSINESS_MONTHLY",
    "RAZORPAY_PLAN_BUSINESS_ANNUAL",
  ])("fails clearly when %s is missing", (name) => {
    expect(() => getBillingConfig(testEnv({ [name]: undefined }))).toThrow(BillingConfigError)
    expect(() => getBillingConfig(testEnv({ [name]: "  " }))).toThrow(name)
  })

  it("marks config errors as 503 BILLING_NOT_CONFIGURED", () => {
    try {
      getBillingConfig({})
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({ status: 503, code: "BILLING_NOT_CONFIGURED" })
    }
  })

  it("never puts the secret in an error message", () => {
    try {
      getBillingConfig(testEnv({ RAZORPAY_KEY_ID: "bad_key", RAZORPAY_KEY_SECRET: "super_secret_value" }))
      expect.unreachable()
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("super_secret_value")
    }
  })

  it("rejects a plan ID that doesn't look like a Razorpay plan", () => {
    expect(() => getBillingConfig(testEnv({ RAZORPAY_PLAN_PLUS_ANNUAL: "sub_123" }))).toThrow(BillingConfigError)
  })

  it("catches two plans set to the same ID (copy-paste mistake)", () => {
    expect(() =>
      getBillingConfig(testEnv({ RAZORPAY_PLAN_BUSINESS_MONTHLY: PLAN_IDS.RAZORPAY_PLAN_PLUS_MONTHLY })),
    ).toThrow(/same plan ID/)
  })

  it("rejects a key that is neither test nor live", () => {
    expect(() => getBillingConfig(testEnv({ RAZORPAY_KEY_ID: "abc123" }))).toThrow(BillingConfigError)
  })

  it("refuses a TEST key in production", () => {
    expect(() => getBillingConfig(testEnv({ VERCEL_ENV: "production" }))).toThrow(/live key/)
  })

  it("accepts a LIVE key in production", () => {
    const config = getBillingConfig(testEnv({ VERCEL_ENV: "production", RAZORPAY_KEY_ID: "rzp_live_abc" }))
    expect(config.mode).toBe("live")
  })

  it.each([
    ["local dev", undefined],
    ["a preview deployment", "preview"],
    ["a development deployment", "development"],
  ])("refuses a LIVE key in %s (no real charges while testing)", (_label, vercelEnv) => {
    expect(() => getBillingConfig(testEnv({ VERCEL_ENV: vercelEnv, RAZORPAY_KEY_ID: "rzp_live_abc" }))).toThrow(
      /test key/,
    )
  })
})

describe("plan ID lookups", () => {
  const config = getBillingConfig(testEnv())

  it("maps each choice to its Razorpay plan ID", () => {
    expect(razorpayPlanIdFor({ plan: "plus", cycle: "monthly" }, config)).toBe("plan_PlusMonthly01")
    expect(razorpayPlanIdFor({ plan: "plus", cycle: "annual" }, config)).toBe("plan_PlusAnnual01")
    expect(razorpayPlanIdFor({ plan: "business", cycle: "monthly" }, config)).toBe("plan_BizMonthly01")
    expect(razorpayPlanIdFor({ plan: "business", cycle: "annual" }, config)).toBe("plan_BizAnnual01")
  })

  it("maps a Razorpay plan ID back to the plan that was paid for", () => {
    expect(planForRazorpayPlanId("plan_BizAnnual01", config)).toEqual({ plan: "business", cycle: "annual" })
    expect(planForRazorpayPlanId("plan_PlusMonthly01", config)).toEqual({ plan: "plus", cycle: "monthly" })
  })

  it.each([
    ["unknown ID", "plan_SomethingElse"],
    ["empty", ""],
    ["prototype key", "__proto__"],
    ["not a string", 42],
  ])("returns null for an %s", (_label, id) => {
    expect(planForRazorpayPlanId(id as string, config)).toBeNull()
  })
})
