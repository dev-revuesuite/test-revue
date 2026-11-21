import { notFound, redirect } from "next/navigation"

import {
  STATE_LABELS,
  subscriptionState,
  summarizeBilling,
  type SubscriptionState,
} from "@/lib/billing/admin-summary"
import { formatInr, PLAN_LABELS, PLAN_PRICES_INR } from "@/lib/billing/plan-prices"
import { isPlatformDeveloper } from "@/lib/platform-developer-access"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type SubRow = {
  razorpay_subscription_id: string
  plan_id: string
  billing_cycle: string
  status: string
  paid_until: string | null
  grace_ends_at: string | null
  current_period_end: string | null
  created_at: string
  created_by: string | null
  organizations: { name: string } | null
}

type PaymentRow = {
  razorpay_payment_id: string
  amount_paise: number
  amount_refunded_paise: number
  status: string
  paid_at: string | null
  description: string | null
  organizations: { name: string } | null
  billing_subscriptions: { plan_id: string; billing_cycle: string } | null
}

type EventRow = { event_id: string; event_type: string; received_at: string; error: string | null }

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : "—"

const STATE_STYLES: Record<SubscriptionState, string> = {
  paying: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  payment_failing: "bg-red-500/10 text-red-700 dark:text-red-300",
  cancelled_with_time_left: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  ended: "bg-muted text-muted-foreground",
  not_paid: "bg-muted text-muted-foreground",
}

/**
 * Internal billing overview: who pays, whose payment is failing, who cancelled,
 * recent payments and billing problems. Platform developers only (the same
 * list as /internal/ai-logs). Read-only; data is loaded with the service role
 * AFTER that check.
 */
export default async function InternalBillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isPlatformDeveloper(user.id)) notFound()
  if (!isAdminClientConfigured()) notFound()

  const admin = createAdminClient()
  const [subsResult, paymentsResult, eventsResult, usersResult] = await Promise.all([
    admin
      .from("billing_subscriptions")
      .select(
        "razorpay_subscription_id, plan_id, billing_cycle, status, paid_until, grace_ends_at, current_period_end, created_at, created_by, organizations(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("billing_payments")
      .select(
        "razorpay_payment_id, amount_paise, amount_refunded_paise, status, paid_at, description, organizations(name), billing_subscriptions(plan_id, billing_cycle)"
      )
      .order("paid_at", { ascending: false })
      .limit(200),
    admin
      .from("billing_events")
      .select("event_id, event_type, received_at, error")
      .not("error", "is", null)
      .not("error", "in", '("ignored event type","unknown order","already granted")')
      .order("received_at", { ascending: false })
      .limit(20),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const subs = (subsResult.data ?? []) as unknown as SubRow[]
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[]
  const problems = (eventsResult.data ?? []) as EventRow[]
  const emails = new Map((usersResult.data?.users ?? []).map((u) => [u.id, u.email ?? ""]))
  const loadError = subsResult.error?.message ?? paymentsResult.error?.message ?? null

  const now = new Date()
  const summary = summarizeBilling(subs, payments, PLAN_PRICES_INR, now)
  const planName = (planId: string, cycle: string) =>
    `${PLAN_LABELS[planId as keyof typeof PLAN_LABELS]?.name ?? planId} · ${cycle === "annual" ? "Annual" : "Monthly"}`

  const tiles: { label: string; value: string }[] = [
    { label: "Paying", value: String(summary.paying) },
    { label: "Payment failing", value: String(summary.paymentFailing) },
    { label: "Cancelled, time left", value: String(summary.cancelledWithTimeLeft) },
    { label: "Ended", value: String(summary.ended) },
    { label: "Expected per month", value: formatInr(summary.monthlyRunRateInr) },
    { label: "Received this month", value: formatInr(summary.receivedThisMonthInr) },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-foreground">Billing overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Internal, read-only. Amounts include GST. Dates are in India time. Showing the latest 200 subscriptions and
        payments.
      </p>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Couldn&apos;t load billing data: {loadError}
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="billing-subs-title" className="mt-8">
        <h2 id="billing-subs-title" className="text-sm font-semibold text-foreground">
          Subscriptions
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Owner</th>
                <th scope="col" className="px-4 py-2 font-medium">Workspace</th>
                <th scope="col" className="px-4 py-2 font-medium">Plan</th>
                <th scope="col" className="px-4 py-2 font-medium">State</th>
                <th scope="col" className="px-4 py-2 font-medium">Paid until</th>
                <th scope="col" className="px-4 py-2 font-medium">Started</th>
                <th scope="col" className="px-4 py-2 font-medium">Razorpay ID</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No subscriptions yet.
                  </td>
                </tr>
              ) : null}
              {subs.map((sub) => {
                const state = subscriptionState(sub, now)
                return (
                  <tr key={sub.razorpay_subscription_id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-foreground">
                      {sub.created_by ? emails.get(sub.created_by) || "—" : "Deleted user"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{sub.organizations?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {planName(sub.plan_id, sub.billing_cycle)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATE_STYLES[state])}>
                        {STATE_LABELS[state]}
                      </span>
                      {state === "payment_failing" ? (
                        <span className="ml-2 text-xs text-muted-foreground">until {day(sub.grace_ends_at)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{day(sub.paid_until)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{day(sub.created_at)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {sub.razorpay_subscription_id}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="billing-payments-title" className="mt-8">
        <h2 id="billing-payments-title" className="text-sm font-semibold text-foreground">
          Payments
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Date</th>
                <th scope="col" className="px-4 py-2 font-medium">Workspace</th>
                <th scope="col" className="px-4 py-2 font-medium">For</th>
                <th scope="col" className="px-4 py-2 font-medium">Amount</th>
                <th scope="col" className="px-4 py-2 font-medium">Refunded</th>
                <th scope="col" className="px-4 py-2 font-medium">Razorpay ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No payments yet.
                  </td>
                </tr>
              ) : null}
              {payments.map((payment) => (
                <tr key={payment.razorpay_payment_id} className="border-t border-border">
                  <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{day(payment.paid_at)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{payment.organizations?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                    {payment.billing_subscriptions
                      ? planName(payment.billing_subscriptions.plan_id, payment.billing_subscriptions.billing_cycle)
                      : (payment.description ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-foreground">
                    {formatInr(payment.amount_paise / 100)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {payment.amount_refunded_paise > 0 ? formatInr(payment.amount_refunded_paise / 100) : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {payment.razorpay_payment_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="billing-problems-title" className="mt-8">
        <h2 id="billing-problems-title" className="text-sm font-semibold text-foreground">
          Messages from Razorpay that need a look
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The latest 20 that could not be applied (for example an unknown subscription or a wrong amount).
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">When</th>
                <th scope="col" className="px-4 py-2 font-medium">Type</th>
                <th scope="col" className="px-4 py-2 font-medium">Problem</th>
              </tr>
            </thead>
            <tbody>
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Nothing needs attention.
                  </td>
                </tr>
              ) : null}
              {problems.map((event) => (
                <tr key={event.event_id} className="border-t border-border">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{day(event.received_at)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">{event.event_type}</td>
                  <td className="px-4 py-2.5 text-foreground">{event.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
