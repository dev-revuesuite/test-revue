// Remembers which paid plan a visitor picked on the landing page
// (/qc-tool/signup?plan=plus&cycle=monthly) through signup, email confirmation
// and Google sign-in, so the /start screen can pre-select it.
//
// It's only a UI preference: it can't change a price or unlock anything (the
// server picks the Razorpay plan; only Razorpay's confirmation unlocks).

import {
  BILLING_CYCLES,
  PAID_PLAN_IDS,
  type BillingCycle,
  type PaidPlanId,
  type PlanChoice,
} from "@/lib/billing/billing-plans"

const KEY = "revue:plan-intent"
const MAX_AGE_MS = 24 * 60 * 60 * 1000

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

const isPlan = (v: unknown): v is PaidPlanId => (PAID_PLAN_IDS as readonly unknown[]).includes(v)
const isCycle = (v: unknown): v is BillingCycle => (BILLING_CYCLES as readonly unknown[]).includes(v)

/** Reads ?plan=&cycle= from a link. Anything unexpected = no choice. */
export function parsePlanIntent(params: URLSearchParams): PlanChoice | null {
  const plans = params.getAll("plan")
  if (plans.length !== 1 || !isPlan(plans[0])) return null
  const cycle = params.get("cycle")
  return { plan: plans[0], cycle: isCycle(cycle) ? cycle : "monthly" }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export function savePlanIntent(choice: PlanChoice, storage = defaultStorage(), now = Date.now()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ plan: choice.plan, cycle: choice.cycle, savedAt: now }))
  } catch {
    // Storage blocked: the /start screen simply won't pre-select.
  }
}

export function readPlanIntent(storage = defaultStorage(), now = Date.now()): PlanChoice | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as { plan?: unknown; cycle?: unknown; savedAt?: unknown }
    if (!isPlan(value.plan) || !isCycle(value.cycle) || typeof value.savedAt !== "number") return null
    const age = now - value.savedAt
    if (age < 0 || age > MAX_AGE_MS) return null
    return { plan: value.plan, cycle: value.cycle }
  } catch {
    return null
  }
}

export function clearPlanIntent(storage = defaultStorage()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // ignore
  }
}
