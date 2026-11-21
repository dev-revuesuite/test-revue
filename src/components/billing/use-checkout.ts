"use client"

import * as React from "react"

import { useBillingContext } from "@/contexts/plan-features-context"
import type { BillingCycle, PaidPlanId } from "@/lib/billing/billing-plans"
import {
  CheckoutError,
  openCheckout,
  requestCheckout,
  syncBilling,
  waitForPaidPlan,
} from "@/lib/billing/checkout-client"
import { PLAN_LABELS } from "@/lib/billing/plan-prices"

export type CheckoutStep =
  | { kind: "choose"; error?: string }
  | { kind: "starting" }
  | { kind: "confirming" }
  | { kind: "done"; plan: PaidPlanId }
  | { kind: "slow"; plan: PaidPlanId }

/**
 * The whole paid checkout, shared by the upgrade dialog and the /start page:
 * ask our server to start it -> Razorpay's window -> confirm with Razorpay
 * through our server (or the webhook). Nothing here can unlock a plan by itself.
 *
 * `paymentWindowOpen` is true while Razorpay's window is up: a dialog using this
 * must hide itself then, or its focus trap blocks typing in the payment window.
 */
export function useCheckout() {
  const { organizationId, email, name } = useBillingContext()
  const [step, setStep] = React.useState<CheckoutStep>({ kind: "choose" })
  const [paymentWindowOpen, setPaymentWindowOpen] = React.useState(false)
  const busy = step.kind === "starting" || step.kind === "confirming"

  const start = React.useCallback(
    async (plan: PaidPlanId, cycle: BillingCycle, options: { replace?: boolean } = {}) => {
      if (!organizationId) {
        setStep({ kind: "choose", error: "No organization selected." })
        return
      }
      setStep({ kind: "starting" })
      try {
        const session = await requestCheckout({ organizationId, plan, cycle, replace: options.replace })
        setPaymentWindowOpen(true)
        // Let any dialog finish closing (and release focus) before Razorpay opens.
        await new Promise((resolve) => setTimeout(resolve, 300))
        let outcome: Awaited<ReturnType<typeof openCheckout>>
        try {
          outcome = await openCheckout(session, {
            planLabel: `${PLAN_LABELS[plan].name} (${cycle === "monthly" ? "monthly" : "annual"})`,
            email,
            name,
          })
        } finally {
          setPaymentWindowOpen(false)
        }
        if (outcome === "dismissed") {
          setStep({ kind: "choose" })
          return
        }

        setStep({ kind: "confirming" })
        // Done only when Razorpay says THIS subscription is active. The
        // workspace's plan proves nothing here: it can already be the target
        // plan (monthly -> annual, or paying again during the 7 days), or stay
        // on a bigger plan after a switch to a smaller one.
        const paidPlan = async () => {
          const synced = await syncBilling(organizationId)
          return synced.status === "active" && synced.subscriptionId === session.subscriptionId ? plan : null
        }
        const active = await waitForPaidPlan(paidPlan, plan, {
          attempts: 20,
          intervalMs: 3000,
        })
        setStep(active ? { kind: "done", plan } : { kind: "slow", plan })
      } catch (error) {
        setStep({
          kind: "choose",
          error:
            error instanceof CheckoutError
              ? error.message
              : "Something went wrong. You haven't been charged twice; please try again.",
        })
      }
    },
    [organizationId, email, name]
  )

  return { step, start, busy, paymentWindowOpen }
}
