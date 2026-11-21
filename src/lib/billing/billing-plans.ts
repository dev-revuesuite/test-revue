// Server only: which Razorpay plan a customer is buying.
//
// The browser sends only a choice ("plus" + "monthly"). The price lives in the
// Razorpay plan, and the plan IDs come from server env vars, so nothing the
// browser sends can change what is charged.

export const PAID_PLAN_IDS = ["plus", "business"] as const
export const BILLING_CYCLES = ["monthly", "annual"] as const

export type PaidPlanId = (typeof PAID_PLAN_IDS)[number]
export type BillingCycle = (typeof BILLING_CYCLES)[number]
export type PlanChoice = { plan: PaidPlanId; cycle: BillingCycle }

export type BillingConfig = {
  keyId: string
  keySecret: string
  mode: "test" | "live"
  plans: Record<PaidPlanId, Record<BillingCycle, string>>
}

/** Billing isn't set up correctly on the server (missing or wrong env vars). */
export class BillingConfigError extends Error {
  readonly status = 503
  readonly code = "BILLING_NOT_CONFIGURED"
  constructor(message: string) {
    super(message)
    this.name = "BillingConfigError"
  }
}

/** The request asked for something that can't be bought. */
export class BillingInputError extends Error {
  readonly status = 400
  readonly code = "INVALID_PLAN"
  constructor(message = "Choose Plus or Business, billed monthly or annually.") {
    super(message)
    this.name = "BillingInputError"
  }
}

const PLAN_ENV_VARS: Record<PaidPlanId, Record<BillingCycle, string>> = {
  plus: { monthly: "RAZORPAY_PLAN_PLUS_MONTHLY", annual: "RAZORPAY_PLAN_PLUS_ANNUAL" },
  business: { monthly: "RAZORPAY_PLAN_BUSINESS_MONTHLY", annual: "RAZORPAY_PLAN_BUSINESS_ANNUAL" },
}

const RAZORPAY_PLAN_ID = /^plan_[A-Za-z0-9]+$/

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value)

/** Validates what the browser asked for. Any extra fields (amount, plan_id…) are ignored. */
export function parsePlanChoice(input: unknown): PlanChoice {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BillingInputError()
  const { plan, cycle } = input as Record<string, unknown>
  if (!isOneOf(PAID_PLAN_IDS, plan) || !isOneOf(BILLING_CYCLES, cycle)) throw new BillingInputError()
  return { plan, cycle }
}

type Env = Record<string, string | undefined>

function readEnv(env: Env, name: string): string {
  const value = env[name]?.trim().replace(/^["']|["']$/g, "").trim()
  if (!value) throw new BillingConfigError(`${name} is not set.`)
  return value
}

/**
 * Reads and checks the billing env vars. Throws BillingConfigError (never
 * including secret values) when anything is missing or inconsistent.
 *
 * Safety: production (VERCEL_ENV=production) must use a live key, and every
 * other environment must use a test key, so testing can never charge real money.
 */
export function getBillingConfig(env: Env = process.env): BillingConfig {
  const keyId = readEnv(env, "RAZORPAY_KEY_ID")
  const keySecret = readEnv(env, "RAZORPAY_KEY_SECRET")

  const mode = keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : null
  if (!mode) throw new BillingConfigError("RAZORPAY_KEY_ID must start with rzp_test_ or rzp_live_.")

  const isProduction = env.VERCEL_ENV?.trim() === "production"
  if (isProduction && mode !== "live") {
    throw new BillingConfigError("Production must use a Razorpay live key.")
  }
  if (!isProduction && mode !== "test") {
    throw new BillingConfigError("Only production may use a live key; use a Razorpay test key here.")
  }

  const plans = {} as BillingConfig["plans"]
  const seen = new Map<string, string>()
  for (const plan of PAID_PLAN_IDS) {
    plans[plan] = {} as Record<BillingCycle, string>
    for (const cycle of BILLING_CYCLES) {
      const name = PLAN_ENV_VARS[plan][cycle]
      const id = readEnv(env, name)
      if (!RAZORPAY_PLAN_ID.test(id)) throw new BillingConfigError(`${name} must be a Razorpay plan ID (plan_…).`)
      const other = seen.get(id)
      if (other) throw new BillingConfigError(`${other} and ${name} have the same plan ID.`)
      seen.set(id, name)
      plans[plan][cycle] = id
    }
  }

  return { keyId, keySecret, mode, plans }
}

/** The Razorpay plan to subscribe to for a validated choice. */
export function razorpayPlanIdFor(choice: PlanChoice, config: BillingConfig): string {
  return config.plans[choice.plan][choice.cycle]
}

/** Which plan a Razorpay plan ID stands for (from a webhook), or null if it's not ours. */
export function planForRazorpayPlanId(razorpayPlanId: string, config: BillingConfig): PlanChoice | null {
  if (typeof razorpayPlanId !== "string" || !razorpayPlanId) return null
  for (const plan of PAID_PLAN_IDS) {
    for (const cycle of BILLING_CYCLES) {
      if (config.plans[plan][cycle] === razorpayPlanId) return { plan, cycle }
    }
  }
  return null
}
