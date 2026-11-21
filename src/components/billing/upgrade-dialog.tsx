"use client"

import * as React from "react"
import { Check, Loader2, PartyPopper, ShieldCheck } from "lucide-react"

import { useCheckout } from "@/components/billing/use-checkout"
import { useCurrentSubscription } from "@/components/billing/use-current-subscription"
import { ChargedInInrNote, CurrencySwitcher, useDisplayCurrency } from "@/components/billing/use-display-currency"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PAID_PLAN_IDS, type BillingCycle, type PaidPlanId } from "@/lib/billing/billing-plans"
import { formatInr, PLAN_LABELS, PLAN_PRICES_INR } from "@/lib/billing/plan-prices"
import { useTimezone } from "@/contexts/timezone-context"
import { formatInstantInZone } from "@/lib/timezone-preference"
import { cn } from "@/lib/utils"

/**
 * Plan picker + Razorpay checkout (owner only; render it inside whatever
 * dialog or page offers the upgrade). Paying never unlocks anything here:
 * after Razorpay reports success we wait for the webhook to switch the plan.
 * Rendered once by UpgradeDialogHost (never inside another dialog), mounted
 * only while open so every opening starts fresh.
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  defaultPlan = "plus",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPlan?: PaidPlanId
}) {
  const [plan, setPlan] = React.useState<PaidPlanId>(defaultPlan)
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly")
  // Our dialog traps mouse/keyboard focus, which would block typing in
  // Razorpay's window, so it is hidden while that window is open.
  const { step, start: startCheckout, busy, paymentWindowOpen } = useCheckout()
  const { timeZone } = useTimezone()
  // Display only: visitors outside India see a guide price in their own currency.
  const { currency, foreign, abroad, price: show, annualSaving: showSaving, choose } = useDisplayCurrency()

  // What the owner has today (undefined while loading): a running plan can be
  // switched, a cancelled one with paid time left can be bought again.
  const current = useCurrentSubscription()
  const running = current?.state === "running" ? current : null
  const isCurrentChoice = running !== null && running.plan === plan && running.cycle === cycle
  const currentName = current ? PLAN_LABELS[current.plan].name : ""
  const paidUntil = current?.paidUntil ? formatInstantInZone(current.paidUntil, timeZone) : null

  // Open on something they can actually buy, not on the plan they already have.
  const adjusted = React.useRef(false)
  React.useEffect(() => {
    if (adjusted.current || !running) return
    adjusted.current = true
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time default once the current plan is known */
    if (running.plan === "plus" && running.cycle === "monthly") setPlan("business")
  }, [running])

  const start = () => startCheckout(plan, cycle, { replace: running !== null })

  return (
    <Dialog open={open && !paymentWindowOpen} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        {step.kind === "done" || step.kind === "slow" ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                {step.kind === "done" ? (
                  <PartyPopper className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <DialogTitle>
                {step.kind === "done"
                  ? `You're on ${PLAN_LABELS[step.plan].name}`
                  : "Payment received"}
              </DialogTitle>
              <DialogDescription>
                {step.kind === "done"
                  ? "Everything is unlocked. A receipt is on its way to your email."
                  : "We're activating your plan. This can take a few minutes; refresh the page shortly. You won't be charged again."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  // Reload so every page shows the new plan, limits and badge.
                  if (step.kind === "done") window.location.reload()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{running ? "Change your plan" : "Upgrade your plan"}</DialogTitle>
              <DialogDescription>
                Pay securely with UPI, card or netbanking. Cancel anytime.
              </DialogDescription>
            </DialogHeader>

            <div
              role="radiogroup"
              aria-label="Billing period"
              className="mx-auto flex w-fit rounded-full border border-border p-1 text-sm"
            >
              {(["monthly", "annual"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={cycle === value}
                  disabled={busy}
                  onClick={() => setCycle(value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 transition-colors",
                    cycle === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {value === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>

            <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-2">
              {PAID_PLAN_IDS.map((id) => {
                const price = PLAN_PRICES_INR[id][cycle]
                const saving =
                  cycle === "annual" ? showSaving(PLAN_PRICES_INR[id].monthly, PLAN_PRICES_INR[id].annual) : null
                const selected = plan === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={busy}
                    onClick={() => setPlan(id)}
                    className={cn(
                      "relative rounded-xl border p-4 text-left transition-colors",
                      selected ? "border-[#5C6ECD] bg-[#5C6ECD]/5 ring-1 ring-[#5C6ECD]" : "border-border hover:border-foreground/30"
                    )}
                  >
                    {selected ? (
                      <Check className="absolute right-3 top-3 h-4 w-4 text-[#5C6ECD]" aria-hidden />
                    ) : null}
                    {running && running.plan === id && running.cycle === cycle ? (
                      <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Current plan
                      </span>
                    ) : null}
                    <p className="font-semibold text-foreground">{PLAN_LABELS[id].name}</p>
                    <p className="text-xs text-muted-foreground">{PLAN_LABELS[id].tagline}</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">
                      {show(price).main}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{cycle === "monthly" ? "month" : "year"}
                      </span>
                    </p>
                    {foreign ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">Charged as {formatInr(price)}</p>
                    ) : null}
                    {saving ? (
                      <p className="mt-1 text-xs font-medium text-emerald-600">Save {saving} a year</p>
                    ) : null}
                  </button>
                )
              })}
            </div>

            {step.kind === "choose" && step.error ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {step.error}
              </p>
            ) : null}

            {running && !isCurrentChoice ? (
              <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                Switching plans: your {currentName} plan stops renewing as soon as you continue, and{" "}
                {PLAN_LABELS[plan].name} starts when you pay, at full price. Unused days aren&apos;t credited.
                {paidUntil ? ` If you don't finish paying, ${currentName} keeps working until ${paidUntil}.` : null}
              </p>
            ) : current?.state === "ending" ? (
              <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                Your cancelled {currentName} plan still works{paidUntil ? ` until ${paidUntil}` : ""}. A new plan
                starts today at full price; the remaining days aren&apos;t credited. You can also wait and subscribe
                after that date.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Renews automatically every {cycle === "monthly" ? "month" : "year"} until you cancel.
              {current ? null : " Your free trial ends when the paid plan starts."}
            </p>
            <ChargedInInrNote currency={currency} className="text-xs text-muted-foreground" />
            {abroad ? <CurrencySwitcher currency={currency} onChange={choose} /> : null}

            <DialogFooter className="gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
                Not now
              </Button>
              <Button onClick={start} disabled={busy || isCurrentChoice || current === undefined} className="min-w-44">
                {step.kind === "starting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening payment…
                  </>
                ) : step.kind === "confirming" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming payment…
                  </>
                ) : isCurrentChoice ? (
                  "This is your current plan"
                ) : (
                  `Continue to pay ${formatInr(PLAN_PRICES_INR[plan][cycle])}${foreign ? ` (about ${show(PLAN_PRICES_INR[plan][cycle]).main})` : ""}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
