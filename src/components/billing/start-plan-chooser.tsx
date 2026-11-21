"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, PartyPopper, ShieldCheck } from "lucide-react"

import { useCheckout } from "@/components/billing/use-checkout"
import { Button } from "@/components/ui/button"
import { withBasePath } from "@/lib/base-path"
import { PAID_PLAN_IDS, type BillingCycle, type PaidPlanId } from "@/lib/billing/billing-plans"
import { clearPlanIntent, readPlanIntent } from "@/lib/billing/plan-intent"
import { annualSaving, formatInr, PLAN_LABELS, PLAN_PRICES_INR } from "@/lib/billing/plan-prices"
import { cn } from "@/lib/utils"

type CardId = "trial" | PaidPlanId

const PERKS: Record<CardId, string[]> = {
  trial: ["14 days, no card needed", "Upgrade any time"],
  plus: ["250 QC runs a month", "Client reviews and approvals", "Cancel anytime"],
  business: ["Everything in Plus", "More QC runs, members and storage", "Cancel anytime"],
}

/**
 * "How do you want to start?" (shown once, right after a new owner creates
 * their first organization). Free trial is highlighted unless the visitor came
 * from the pricing page with a plan in the link.
 */
export function StartPlanChooser({ trialDays }: { trialDays: number | null }) {
  const router = useRouter()
  const { step, start, busy } = useCheckout()
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly")
  const [highlight, setHighlight] = React.useState<CardId>("trial")

  // The saved choice lives in browser storage, so read it after mount.
  React.useEffect(() => {
    const intent = readPlanIntent()
    if (!intent) return
    /* eslint-disable react-hooks/set-state-in-effect -- reads browser storage once after mount */
    setHighlight(intent.plan)
    setCycle(intent.cycle)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const goToStudio = (reload: boolean) => {
    clearPlanIntent()
    if (reload) window.location.assign(withBasePath("/studio"))
    else router.push("/studio")
  }

  if (step.kind === "done" || step.kind === "slow") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
          {step.kind === "done" ? (
            <PartyPopper className="h-6 w-6 text-emerald-600" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          )}
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {step.kind === "done" ? `You're on ${PLAN_LABELS[step.plan].name}` : "Payment received"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step.kind === "done"
            ? "Everything is unlocked. A receipt is on its way to your email."
            : "We're activating your plan. This can take a few minutes. You won't be charged again."}
        </p>
        <Button className="mt-6" onClick={() => goToStudio(true)}>
          Go to Studio
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-foreground">How do you want to start?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your organization is ready. Try Revue free, or pick a plan now. You can change this later.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Billing period"
        className="mx-auto mt-6 flex w-fit rounded-full border border-border p-1 text-sm"
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card
          highlighted={highlight === "trial"}
          title="Free trial"
          tagline={trialDays !== null ? `${trialDays} days left` : "Try everything first"}
          price="₹0"
          perks={PERKS.trial}
        >
          <Button
            className="w-full"
            variant={highlight === "trial" ? "default" : "outline"}
            disabled={busy}
            onClick={() => goToStudio(false)}
          >
            Start free trial
          </Button>
        </Card>

        {PAID_PLAN_IDS.map((plan) => {
          const saving = cycle === "annual" ? annualSaving(plan) : null
          return (
            <Card
              key={plan}
              highlighted={highlight === plan}
              title={PLAN_LABELS[plan].name}
              tagline={PLAN_LABELS[plan].tagline}
              price={formatInr(PLAN_PRICES_INR[plan][cycle])}
              priceSuffix={cycle === "monthly" ? "/month" : "/year"}
              note={saving ? `Save ${formatInr(saving)} a year` : undefined}
              perks={PERKS[plan]}
            >
              <Button
                className="w-full"
                variant={highlight === plan ? "default" : "outline"}
                disabled={busy}
                onClick={() => {
                  setHighlight(plan)
                  void start(plan, cycle)
                }}
              >
                {busy && highlight === plan ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {step.kind === "confirming" ? "Confirming payment…" : "Opening payment…"}
                  </>
                ) : (
                  `Buy ${PLAN_LABELS[plan].name}`
                )}
              </Button>
            </Card>
          )
        })}
      </div>

      {step.kind === "choose" && step.error ? (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {step.error}
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Paid plans renew automatically until you cancel and end the free trial when they start. Pay with
        UPI, card or netbanking.
      </p>
      {highlight !== "trial" && !busy ? (
        <p className="mt-2 text-center text-sm">
          <button type="button" className="text-muted-foreground underline" onClick={() => goToStudio(false)}>
            Or continue with your free trial
          </button>
        </p>
      ) : null}
    </div>
  )
}

function Card({
  highlighted,
  title,
  tagline,
  price,
  priceSuffix,
  note,
  perks,
  children,
}: {
  highlighted: boolean
  title: string
  tagline: string
  price: string
  priceSuffix?: string
  note?: string
  perks: string[]
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-5 bg-card",
        highlighted ? "border-[#5C6ECD] ring-1 ring-[#5C6ECD]" : "border-border"
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{tagline}</p>
      <p className="mt-4 text-3xl font-semibold text-foreground tabular-nums">
        {price}
        {priceSuffix ? <span className="text-sm font-normal text-muted-foreground">{priceSuffix}</span> : null}
      </p>
      {note ? <p className="mt-1 text-xs font-medium text-emerald-600">{note}</p> : <div className="mt-1 h-4" />}
      <ul className="mt-4 mb-6 space-y-2 text-sm text-muted-foreground">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5C6ECD]" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{children}</div>
    </div>
  )
}
