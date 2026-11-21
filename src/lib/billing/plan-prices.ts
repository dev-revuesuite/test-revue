// Prices shown in the plan picker (display only).
//
// What is actually charged is the amount on the Razorpay plan the server picks
// (RAZORPAY_PLAN_* env vars). Keep these in sync with the Razorpay dashboard and
// the pricing page. Rupees, GST not shown separately (decided Nov 2026: later).

import type { BillingCycle, PaidPlanId } from "@/lib/billing/billing-plans"

export const PLAN_PRICES_INR: Record<PaidPlanId, Record<BillingCycle, number>> = {
  plus: { monthly: 2499, annual: 24999 },
  business: { monthly: 9999, annual: 99999 },
}

export const PLAN_LABELS: Record<PaidPlanId, { name: string; tagline: string }> = {
  plus: { name: "Plus", tagline: "For small creative teams" },
  business: { name: "Business", tagline: "For agencies with more clients and reviewers" },
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

/** "Save ₹4,989" for annual vs 12 × monthly, or null if there's no saving. */
export function annualSaving(plan: PaidPlanId): number | null {
  const { monthly, annual } = PLAN_PRICES_INR[plan]
  const saving = monthly * 12 - annual
  return saving > 0 ? saving : null
}

/** Billing goes live per environment with NEXT_PUBLIC_BILLING_ENABLED=true. */
export function isBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === "true"
}
