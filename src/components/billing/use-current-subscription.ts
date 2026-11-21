"use client"

import * as React from "react"

import type { BillingCycle, PaidPlanId } from "@/lib/billing/billing-plans"
import { pickRelevantSubscription } from "@/lib/billing/relevant-subscription"
import { createClient } from "@/lib/supabase/client"

export type CurrentSubscription = {
  plan: PaidPlanId
  cycle: BillingCycle
  /** "running": renews by itself. "ending": cancelled, paid time left. */
  state: "running" | "ending"
  /** End of the time already paid for (ISO), if known. */
  paidUntil: string | null
}

const RUNNING = new Set(["active", "authenticated", "paused"])

type Row = {
  plan_id: string
  billing_cycle: string
  status: string
  grace_ends_at: string | null
  current_period_end: string | null
  paid_until?: string | null
}

/** What the plan picker needs to know about a subscription row. Exported for tests. */
export function describeSubscription(row: Row | null, now: Date = new Date()): CurrentSubscription | null {
  if (!row) return null
  if (row.plan_id !== "plus" && row.plan_id !== "business") return null
  const plan = row.plan_id
  const cycle: BillingCycle = row.billing_cycle === "annual" ? "annual" : "monthly"
  const paidUntil = row.paid_until ?? row.current_period_end ?? null

  if (RUNNING.has(row.status)) return { plan, cycle, state: "running", paidUntil }

  // Cancelled after paying (not while a payment was failing), with time left.
  const stillPaid = paidUntil !== null && new Date(paidUntil).getTime() > now.getTime()
  if ((row.status === "cancelled" || row.status === "completed") && !row.grace_ends_at && stillPaid) {
    return { plan, cycle, state: "ending", paidUntil }
  }
  return null
}

/**
 * The signed-in owner's own subscription, if it is running or still has paid
 * time left (RLS only returns the buyer's rows). `undefined` while loading.
 */
export function useCurrentSubscription(): CurrentSubscription | null | undefined {
  const [current, setCurrent] = React.useState<CurrentSubscription | null | undefined>(undefined)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const columns = "plan_id, billing_cycle, status, grace_ends_at, current_period_end"
      const query = (select: string) =>
        // Newest first; the one that matters is picked below (the newest row is
        // often an unpaid or abandoned checkout).
        createClient().from("billing_subscriptions").select(select).order("created_at", { ascending: false }).limit(10)
      let { data, error } = await query(`${columns}, paid_until`)
      // Before the billing v6 migration there is no paid_until column.
      if (error) ({ data, error } = await query(columns))
      if (!cancelled) {
        setCurrent(error ? null : describeSubscription(pickRelevantSubscription((data ?? []) as unknown as Row[])))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return current
}
