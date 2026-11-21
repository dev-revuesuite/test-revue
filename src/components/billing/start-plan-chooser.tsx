"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Check, Loader2, PartyPopper, Receipt, RefreshCcw, ShieldCheck } from "lucide-react"

import { useCheckout } from "@/components/billing/use-checkout"
import { ChargedInInrNote, CurrencySwitcher, useDisplayCurrency } from "@/components/billing/use-display-currency"
import { publicPath, withBasePath } from "@/lib/base-path"
import { PAID_PLAN_IDS, type BillingCycle, type PaidPlanId } from "@/lib/billing/billing-plans"
import { clearPlanIntent, readPlanIntent } from "@/lib/billing/plan-intent"
import { formatInr, PLAN_LABELS, PLAN_PRICES_INR } from "@/lib/billing/plan-prices"
import { cn } from "@/lib/utils"

type CardId = "trial" | PaidPlanId

// What each plan includes. Keep in sync with the `plans` table and the pricing page.
const PERKS: Record<CardId, string[]> = {
  trial: ["5 QC runs a day", "1 GB storage", "5 team members", "2 guest reviewers"],
  plus: [
    "250 QC runs a month",
    "100 GB storage",
    "25 team members",
    "20 guest reviewers",
    "5 workspaces",
    "Productive mode and approvals",
  ],
  business: [
    "5,000 QC runs a month",
    "1 TB storage",
    "Unlimited team members",
    "Unlimited guest reviewers",
    "Unlimited workspaces",
    "Everything in Plus",
  ],
}

const TRUST = [
  { icon: ShieldCheck, text: "Secure payment by Razorpay" },
  { icon: RefreshCcw, text: "Cancel anytime" },
  { icon: Receipt, text: "Prices include GST" },
]

/** Biggest annual discount across plans, as a whole percentage (rounded down). */
function annualDiscountPercent(): number {
  return Math.max(
    ...PAID_PLAN_IDS.map((plan) => {
      const { monthly, annual } = PLAN_PRICES_INR[plan]
      return Math.floor(((monthly * 12 - annual) / (monthly * 12)) * 100)
    }),
  )
}

/**
 * "How do you want to start?" (shown once, right after a new owner creates
 * their first organization). It continues the dark onboarding screens. Free
 * trial is highlighted unless the visitor came from the pricing page with a
 * plan in the link. The checkout itself is unchanged (useCheckout).
 */
export function StartPlanChooser({ trialDays }: { trialDays: number | null }) {
  const router = useRouter()
  const { step, start, busy } = useCheckout()
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly")
  const [highlight, setHighlight] = React.useState<CardId>("trial")
  // Display only: visitors outside India see a guide price in their own currency.
  const { currency, foreign, abroad, price: show, annualSaving: showSaving, choose } = useDisplayCurrency()

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

  const finished = step.kind === "done" || step.kind === "slow"
  const discount = annualDiscountPercent()

  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-zinc-950 text-white">
      {/* Ambient background, as on the onboarding screens */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#DBFE52]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#5C6ECD]/10 blur-3xl" />
      </div>

      <header className="relative z-10 flex w-full items-center justify-between px-6 pt-5 sm:px-8">
        <Image src={publicPath("/Logo/Artboard_1.png")} alt="Revue" width={104} height={32} priority />
        <p className="text-sm text-zinc-500">
          <span className="sr-only">Progress: </span>Last step
        </p>
      </header>

      <main className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-5">
        {finished ? (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DBFE52]/10">
              {step.kind === "done" ? (
                <PartyPopper className="h-7 w-7 text-[#DBFE52]" aria-hidden />
              ) : (
                <ShieldCheck className="h-7 w-7 text-[#DBFE52]" aria-hidden />
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {step.kind === "done" ? `You're on ${PLAN_LABELS[step.plan].name}` : "Payment received"}
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              {step.kind === "done"
                ? "Everything is unlocked. A receipt is on its way to your email."
                : "We're activating your plan. This can take a few minutes. You won't be charged again."}
            </p>
            <button
              type="button"
              onClick={() => goToStudio(true)}
              className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#DBFE52] px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#e6ff7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBFE52] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Go to Studio
            </button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">How do you want to start?</h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400">
                Your organization is ready. Try Revue free for {trialDays ?? 14} days, or pick a plan now. You can
                change this any time.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Billing period"
              className="mx-auto mt-5 flex w-fit items-center rounded-full border border-zinc-800 bg-zinc-900 p-1 text-sm"
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
                    "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBFE52] disabled:opacity-60",
                    cycle === value ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white",
                  )}
                >
                  {value === "monthly" ? "Monthly" : "Annual"}
                  {value === "annual" && discount > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        cycle === "annual" ? "bg-zinc-950 text-[#DBFE52]" : "bg-[#DBFE52]/15 text-[#DBFE52]",
                      )}
                    >
                      Save {discount}%
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3 md:items-stretch">
              <Card
                highlighted={highlight === "trial"}
                title="Free trial"
                tagline="Try everything first. No card needed."
                price={show(0).main}
                priceSuffix={trialDays !== null ? `for ${trialDays} days` : undefined}
                perks={PERKS.trial}
              >
                <CardButton primary={highlight === "trial"} disabled={busy} onClick={() => goToStudio(false)}>
                  Start free trial
                </CardButton>
              </Card>

              {PAID_PLAN_IDS.map((plan) => {
                const prices = PLAN_PRICES_INR[plan]
                const annual = cycle === "annual"
                const saving = annual ? showSaving(prices.monthly, prices.annual) : null
                const working = busy && highlight === plan
                return (
                  <Card
                    key={plan}
                    highlighted={highlight === plan}
                    badge={plan === "plus" ? "Most popular" : undefined}
                    title={PLAN_LABELS[plan].name}
                    tagline={PLAN_LABELS[plan].tagline}
                    // The big number is always the full charge (never a per-month
                    // equivalent); outside India it is that charge in local money.
                    price={show(annual ? prices.annual : prices.monthly).main}
                    priceSuffix={annual ? "/year" : "/month"}
                    note={
                      foreign
                        ? `Charged as ${formatInr(annual ? prices.annual : prices.monthly)} ${annual ? "a year" : "a month"}${saving ? ` · save about ${saving}` : ""}`
                        : annual
                          ? `One payment a year${saving ? ` · save ${saving} vs monthly` : ""}`
                          : "Charged every month"
                    }
                    perks={PERKS[plan]}
                  >
                    <CardButton
                      primary={highlight === plan}
                      disabled={busy}
                      onClick={() => {
                        setHighlight(plan)
                        void start(plan, cycle)
                      }}
                    >
                      {working ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          {step.kind === "confirming" ? "Confirming payment…" : "Opening payment…"}
                        </>
                      ) : (
                        `Buy ${PLAN_LABELS[plan].name}`
                      )}
                    </CardButton>
                  </Card>
                )
              })}
            </div>

            {step.kind === "choose" && step.error ? (
              <p
                role="alert"
                className="mx-auto mt-5 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-200"
              >
                {step.error}
              </p>
            ) : null}

            <ul className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
              {TRUST.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#DBFE52]" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-zinc-500">
              Paid plans renew automatically until you cancel, and end the free trial when they start. Pay with{" "}
              {foreign ? "an international card" : "UPI, card or netbanking"}.
            </p>
            <ChargedInInrNote currency={currency} className="mx-auto mt-1 max-w-2xl text-center text-xs text-zinc-500" />
            {abroad ? (
              <CurrencySwitcher currency={currency} onChange={choose} tone="dark" className="mt-3 justify-center" />
            ) : null}

            {highlight !== "trial" && !busy ? (
              <p className="mt-4 text-center text-sm">
                <button
                  type="button"
                  className="text-zinc-400 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBFE52]"
                  onClick={() => goToStudio(false)}
                >
                  Or continue with your free trial
                </button>
              </p>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}

function CardButton({
  primary,
  disabled,
  onClick,
  children,
}: {
  primary: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBFE52] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-[#DBFE52] text-zinc-950 hover:bg-[#e6ff7a]"
          : "border border-zinc-700 bg-zinc-800/60 text-white hover:border-zinc-500 hover:bg-zinc-800",
      )}
    >
      {children}
    </button>
  )
}

function Card({
  highlighted,
  badge,
  title,
  tagline,
  price,
  priceSuffix,
  note,
  perks,
  children,
}: {
  highlighted: boolean
  badge?: string
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
        "relative flex flex-col rounded-2xl border p-5 motion-safe:transition-colors",
        highlighted
          ? "border-[#DBFE52]/70 bg-zinc-900 shadow-[0_0_0_1px_rgba(219,254,82,0.35),0_20px_60px_-30px_rgba(219,254,82,0.35)]"
          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700",
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-6 rounded-full bg-[#DBFE52] px-2.5 py-0.5 text-[11px] font-semibold text-zinc-950">
          {badge}
        </span>
      ) : null}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-400">{tagline}</p>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{price}</span>
        {priceSuffix ? <span className="text-sm text-zinc-400">{priceSuffix}</span> : null}
      </p>
      <p className="mt-0.5 min-h-4 text-xs text-zinc-500">{note}</p>
      <ul className="mt-4 mb-5 space-y-1.5 text-sm text-zinc-300">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#DBFE52]" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{children}</div>
    </div>
  )
}
