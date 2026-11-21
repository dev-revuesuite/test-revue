"use client"

import * as React from "react"
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react"

import { openUpgradeDialog } from "@/components/billing/upgrade-dialog-host"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTimezone } from "@/contexts/timezone-context"
import { CheckoutError, requestCancel, syncBilling } from "@/lib/billing/checkout-client"
import { isBillingEnabled, PLAN_LABELS } from "@/lib/billing/plan-prices"
import { pickRelevantSubscription } from "@/lib/billing/relevant-subscription"
import { createClient } from "@/lib/supabase/client"
import { formatInstantInZone } from "@/lib/timezone-preference"
import { cn } from "@/lib/utils"

type SubscriptionRow = {
  plan_id: "plus" | "business"
  billing_cycle: "monthly" | "annual"
  status: string
  current_period_end: string | null
  grace_ends_at: string | null
  cancel_at_period_end: boolean
  /** End of the last cycle that was actually paid (billing v6). */
  paid_until?: string | null
}

const CANCELLABLE = new Set(["active", "authenticated", "pending", "halted", "paused"])

// Plans belong to the owner's account, so this is the viewer's own latest
// subscription (RLS only returns the buyer's rows), whichever workspace it was
// bought from.
async function loadRecent(): Promise<SubscriptionRow[]> {
  const columns = "plan_id, billing_cycle, status, current_period_end, grace_ends_at, cancel_at_period_end"
  // One row per checkout attempt, newest first: the newest is often an unpaid
  // checkout, so a few are loaded and the one that matters is picked from them.
  const query = (select: string) =>
    createClient().from("billing_subscriptions").select(select).order("created_at", { ascending: false }).limit(10)
  let { data, error } = await query(`${columns}, paid_until`)
  // Before the billing v6 migration there is no paid_until column.
  if (error) ({ data, error } = await query(columns))
  if (error) {
    // Table missing before the billing migration: just show nothing.
    console.warn("[billing] Couldn't load subscription:", error.message)
    return []
  }
  return (data ?? []) as unknown as SubscriptionRow[]
}

/**
 * The owner's subscription (RLS returns nothing to anyone else): next payment
 * date, a failed-payment warning, or the cancel date, plus "Cancel plan".
 * If a checkout was left unconfirmed (paid but the page was closed, or the
 * webhook hasn't arrived), it checks with Razorpay once and refreshes the page.
 */
export function BillingStatusCard({ organizationId }: { organizationId: string }) {
  const { timeZone } = useTimezone()
  const [sub, setSub] = React.useState<SubscriptionRow | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [cancelError, setCancelError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      let rows = await loadRecent()
      // The newest row is an unfinished checkout: ask Razorpay what became of it.
      if (rows[0]?.status === "created" && isBillingEnabled()) {
        try {
          const synced = await syncBilling(organizationId)
          rows = await loadRecent()
          // The checkout was PAID just now: reload once so the plan, limits and
          // badges update. Anything else (still unpaid, or it expired) changes
          // nothing on screen, so there is no reload (and it can never loop).
          if (!cancelled && synced.status === "active" && rows[0]?.status === "active") {
            window.location.reload()
            return
          }
        } catch (error) {
          console.warn("[billing] Couldn't check the checkout:", error instanceof Error ? error.message : error)
        }
      }
      // An unpaid or abandoned checkout never hides the real subscription.
      if (!cancelled) setSub(pickRelevantSubscription(rows))
    })()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  if (!sub) return null

  const planName = `${PLAN_LABELS[sub.plan_id]?.name ?? sub.plan_id} · ${sub.billing_cycle === "annual" ? "Annual" : "Monthly"}`
  const date = (value: string | null) => (value ? formatInstantInZone(value, timeZone) : "soon")
  const failed = sub.status === "pending" || sub.status === "halted"
  const canCancel = isBillingEnabled() && CANCELLABLE.has(sub.status) && !sub.cancel_at_period_end
  // The 7 days after a failed payment are over: the workspaces are view-only.
  const graceOver = failed && sub.grace_ends_at !== null && new Date(sub.grace_ends_at) <= new Date()
  // A failed payment can always be fixed by paying again (the server replaces
  // the failing subscription with the new one).
  const canPayAgain = failed && isBillingEnabled()
  // A running plan can be switched; a cancelled or ended one can be bought again.
  const running = (sub.status === "active" || sub.status === "authenticated") && !sub.cancel_at_period_end
  const ended = sub.status === "cancelled" || sub.status === "completed"
  const planAction = !isBillingEnabled() ? null : running ? "Change plan" : ended ? "Subscribe again" : null

  // What the customer has paid for. Razorpay's own date (current_period_end)
  // can already point at the next, unpaid cycle, so it's only the fallback.
  const paidUntil = sub.paid_until ?? sub.current_period_end

  let message: string
  if (sub.status === "active" && sub.cancel_at_period_end) {
    message = `Cancelled. Your plan works until ${date(paidUntil)}, then your workspaces become view-only. You won't be charged again.`
  } else if (sub.status === "active" || sub.status === "authenticated") {
    message = `Next payment on ${date(sub.current_period_end)}. Renews automatically.`
  } else if (failed && graceOver) {
    message =
      "Your payment failed and your plan has ended, so your workspaces are view-only. Your data is kept. Pay again to switch them back on."
  } else if (failed) {
    message = `Your last payment failed. Razorpay is retrying automatically. Make sure your UPI, card or bank account can be charged before ${date(sub.grace_ends_at)}, or your workspaces become view-only. You can also pay now with another method; that replaces this subscription.`
  } else if (sub.status === "cancelled" || sub.status === "completed") {
    // Ended while a payment was failing: only the rest of the 7 days is left.
    const inGrace = sub.grace_ends_at !== null && new Date(sub.grace_ends_at) > new Date()
    const end = sub.grace_ends_at ? null : paidUntil
    message = inGrace
      ? `Your last payment failed. Your plan works until ${date(sub.grace_ends_at)}, then your workspaces become view-only. Subscribe again to keep them running.`
      : end && new Date(end) > new Date()
        ? `Cancelled. Your plan works until ${date(end)}, then your workspaces become view-only. You won't be charged again.`
        : "Your subscription has ended. You won't be charged again."
  } else {
    message = `Subscription status: ${sub.status}.`
  }

  const cancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      const result = await requestCancel(organizationId)
      setConfirmOpen(false)
      if (!result.atPeriodEnd) {
        // Access ended now: reload so every page shows view-only.
        window.location.reload()
        return
      }
      setSub(pickRelevantSubscription(await loadRecent()))
    } catch (error) {
      setCancelError(error instanceof CheckoutError ? error.message : "Couldn't cancel the plan. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  const keepsAccess = sub.status === "active"

  return (
    <div
      className={cn(
        "border rounded-xl p-4 mb-4 flex gap-3",
        failed ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
      )}
    >
      {failed ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
      ) : (
        <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Billing: {planName}</p>
        <p className={cn("text-sm mt-0.5", failed ? "text-destructive" : "text-muted-foreground")}>{message}</p>
      </div>
      {canPayAgain || canCancel || planAction ? (
        <div className="flex shrink-0 flex-col gap-2 self-start">
          {canPayAgain ? (
            <Button size="sm" onClick={openUpgradeDialog}>
              {graceOver ? "Pay again" : "Pay now"}
            </Button>
          ) : null}
          {planAction ? (
            <Button variant={ended ? "default" : "outline"} size="sm" onClick={openUpgradeDialog}>
              {planAction}
            </Button>
          ) : null}
          {canCancel ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
              Cancel plan
            </Button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={(open) => !cancelling && setConfirmOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {PLAN_LABELS[sub.plan_id]?.name ?? "your plan"}?</DialogTitle>
            <DialogDescription>
              {keepsAccess
                ? `You won't be charged again. All your workspaces keep the plan until ${date(paidUntil)}, then become view-only. Your data is kept.`
                : "Your plan ends now and all your workspaces become view-only. Your data is kept, and you can subscribe again any time."}
            </DialogDescription>
          </DialogHeader>
          {cancelError ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {cancelError}
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" disabled={cancelling} onClick={() => setConfirmOpen(false)}>
              Keep my plan
            </Button>
            <Button variant="destructive" disabled={cancelling} onClick={cancel}>
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cancelling…
                </>
              ) : (
                "Cancel plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
