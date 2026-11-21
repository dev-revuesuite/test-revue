// Server only: the daily billing safety check (runs in the nightly cron).
//
// 1. Every live subscription is refreshed from Razorpay's API, so a missed or
//    rejected webhook can't leave a paying customer locked (or a lapsed one
//    unlocked) for more than a day.
// 2. Checkouts left unpaid for over 2 days are cancelled at Razorpay.
// 3. Every paying owner is re-checked, which ends access once the 7-day grace
//    period or a cancelled plan's paid period is over (billing_sync_owner).

import type { RazorpayApi } from "@/lib/billing/razorpay-api"
import { applyRemoteSubscription, type ApplyEventFn } from "@/lib/billing/sync-service"

const ABANDONED_AFTER_MS = 48 * 60 * 60 * 1000

export type ReconcileDeps = {
  /** Subscriptions in a live status (created, authenticated, active, pending, halted, paused). */
  listOpenSubscriptions(): Promise<{ id: string; razorpay_subscription_id: string; status: string; created_at: string }[]>
  /** Everyone who has ever had a subscription. */
  listBillingOwners(): Promise<string[]>
  /** billing_sync_owner: 'granted' | 'revoked' | 'unchanged'. */
  syncOwner(ownerId: string): Promise<string>
  razorpay: Pick<RazorpayApi, "fetchSubscription" | "listPaidInvoices" | "cancelSubscription">
  applyEvent: ApplyEventFn
  now?: () => Date
}

export type ReconcileResult = {
  dryRun: boolean
  checked: number
  applied: number
  abandonedCancelled: number
  owners: number
  revoked: number
  granted: number
  failed: number
}

const LOG = "[billing-reconcile]"
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export async function runBillingReconcile(deps: ReconcileDeps, opts: { dryRun: boolean }): Promise<ReconcileResult> {
  const now = deps.now ?? (() => new Date())
  const result: ReconcileResult = {
    dryRun: opts.dryRun,
    checked: 0,
    applied: 0,
    abandonedCancelled: 0,
    owners: 0,
    revoked: 0,
    granted: 0,
    failed: 0,
  }

  for (const sub of await deps.listOpenSubscriptions()) {
    result.checked++
    try {
      const remote = await deps.razorpay.fetchSubscription(sub.razorpay_subscription_id)
      if (remote.status === "created") {
        const age = now().getTime() - new Date(sub.created_at).getTime()
        if (sub.status === "created" && age > ABANDONED_AFTER_MS) {
          result.abandonedCancelled++
          if (!opts.dryRun) {
            // Record Razorpay's answer through the normal path: if it was paid
            // at the very last moment, the paid period is kept.
            const cancelled = await deps.razorpay.cancelSubscription(sub.razorpay_subscription_id)
            await applyRemoteSubscription(sub.razorpay_subscription_id, { ...deps, now }, cancelled)
          }
        }
        continue
      }
      if (!opts.dryRun) {
        await applyRemoteSubscription(sub.razorpay_subscription_id, { ...deps, now }, remote)
        result.applied++
      }
    } catch (error) {
      result.failed++
      console.error(LOG, `Couldn't refresh ${sub.razorpay_subscription_id}:`, message(error))
    }
  }

  const owners = await deps.listBillingOwners()
  result.owners = owners.length
  if (!opts.dryRun) {
    for (const owner of owners) {
      try {
        const outcome = await deps.syncOwner(owner)
        if (outcome === "revoked") result.revoked++
        if (outcome === "granted") result.granted++
      } catch (error) {
        result.failed++
        console.error(LOG, "Couldn't re-check an owner:", message(error))
      }
    }
  }

  return result
}
