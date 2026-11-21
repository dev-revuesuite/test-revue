"use client"

import * as React from "react"
import { ExternalLink } from "lucide-react"

import { useTimezone } from "@/contexts/timezone-context"
import { apiPath } from "@/lib/base-path"
import { formatInr, PLAN_LABELS } from "@/lib/billing/plan-prices"
import { createClient } from "@/lib/supabase/client"
import { formatInstantInZone } from "@/lib/timezone-preference"

type PaymentRow = {
  razorpay_payment_id: string
  razorpay_invoice_id: string | null
  amount_paise: number
  amount_refunded_paise: number
  currency: string
  status: string
  paid_at: string | null
  /** Set for add-ons (e.g. "QC pack · 500 runs"). */
  description?: string | null
  billing_subscriptions: { plan_id: string; billing_cycle: string } | null
}

/** "Paid", "Refunded" or "Partly refunded (₹1,000)". Exported for tests. */
export function paymentStatusLabel(row: Pick<PaymentRow, "status" | "amount_refunded_paise">): string {
  if (row.status === "refunded") return "Refunded"
  if (row.status === "partially_refunded") return `Partly refunded (${formatInr(row.amount_refunded_paise / 100)})`
  return "Paid"
}

/**
 * The owner's payments, newest first, each with a link to its invoice
 * (RLS returns nothing to anyone but the buyer, so everyone else sees no list).
 */
export function PaymentHistory() {
  const { timeZone } = useTimezone()
  const [rows, setRows] = React.useState<PaymentRow[]>([])

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const columns =
        "razorpay_payment_id, razorpay_invoice_id, amount_paise, amount_refunded_paise, currency, status, paid_at, billing_subscriptions(plan_id, billing_cycle)"
      const query = (select: string) =>
        createClient().from("billing_payments").select(select).order("paid_at", { ascending: false }).limit(24)
      let { data, error } = await query(`${columns}, description`)
      // Before the billing v8 migration there is no description column.
      if (error) ({ data, error } = await query(columns))
      if (error) {
        // Table missing before the billing migration: show nothing.
        console.warn("[billing] Couldn't load payments:", error.message)
        return
      }
      if (!cancelled) setRows((data ?? []) as unknown as PaymentRow[])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (rows.length === 0) return null

  return (
    <section aria-labelledby="payment-history-title" className="border border-border rounded-xl p-5 bg-card mb-4">
      <h3 id="payment-history-title" className="text-sm font-semibold text-foreground">
        Payments
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-medium">Date</th>
              <th scope="col" className="py-2 pr-4 font-medium">For</th>
              <th scope="col" className="py-2 pr-4 font-medium">Amount</th>
              <th scope="col" className="py-2 pr-4 font-medium">Status</th>
              <th scope="col" className="py-2 font-medium">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sub = row.billing_subscriptions
              const planName = sub
                ? `${PLAN_LABELS[sub.plan_id as keyof typeof PLAN_LABELS]?.name ?? sub.plan_id} · ${sub.billing_cycle === "annual" ? "Annual" : "Monthly"}`
                : (row.description ?? "—")
              return (
                <tr key={row.razorpay_payment_id} className="border-t border-border">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-foreground">
                    {row.paid_at ? formatInstantInZone(row.paid_at, timeZone) : "—"}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{planName}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums text-foreground">
                    {row.currency === "INR" ? formatInr(row.amount_paise / 100) : `${row.amount_paise / 100} ${row.currency}`}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{paymentStatusLabel(row)}</td>
                  <td className="py-2.5 whitespace-nowrap">
                    {row.razorpay_invoice_id ? (
                      <a
                        href={apiPath(`/api/billing/invoice?payment=${encodeURIComponent(row.razorpay_payment_id)}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#5C6ECD] hover:underline"
                      >
                        View <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">invoice (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Invoices are issued by Razorpay, our payment provider. Need a GST invoice with your GSTIN? Contact us from
        the Help Desk.
      </p>
    </section>
  )
}
