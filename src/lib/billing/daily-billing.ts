// Server only: wires the daily billing check to Supabase (service role) and
// Razorpay. Skipped quietly where billing isn't configured (e.g. production
// before go-live), so the nightly cron keeps working everywhere.

import type { SupabaseClient } from "@supabase/supabase-js"

import { settleAddonOrder } from "@/lib/billing/addon-service"
import { createAddonStore, createApplyAddon, listRecentOpenAddonOrders } from "@/lib/billing/addon-store"
import { createApplyEvent } from "@/lib/billing/apply-event"
import { emitBillingNotices, sendBillingNoticeEmails } from "@/lib/billing/billing-notices"
import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { createRazorpayApi } from "@/lib/billing/razorpay-api"
import { runBillingReconcile, type ReconcileResult } from "@/lib/billing/reconcile-service"
import { OPEN_SUBSCRIPTION_STATUSES } from "@/lib/billing/subscribe-store"

const PAGE_SIZE = 1000

/**
 * Reads every row of a query, page by page. The API returns at most 1,000 rows
 * per request, so an unpaged read would silently skip customers once there are
 * more subscription rows than that (one row per checkout attempt).
 */
export async function readAllRows<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw new Error(`${label} failed: ${error.message}`)
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
}

export type DailyBillingResult = ReconcileResult & {
  /** Owner notices newly sent (plan ending / ended, missed ones). */
  notices: number
  emailsSent: number
  emailsFailed: number
  /** Add-on orders that were paid but not yet added (closed tab, missed webhook). */
  addonsGranted: number
  addonsFailed: number
}

export async function runDailyBilling(
  admin: SupabaseClient,
  opts: { dryRun: boolean },
): Promise<DailyBillingResult | { skipped: string }> {
  let config
  try {
    config = getBillingConfig()
  } catch (error) {
    if (error instanceof BillingConfigError) return { skipped: "billing is not configured" }
    throw error
  }

  const result = await runBillingReconcile(
    {
      async listOpenSubscriptions() {
        return readAllRows<{ id: string; razorpay_subscription_id: string; status: string; created_at: string }>(
          "listing subscriptions",
          (from, to) =>
            admin
              .from("billing_subscriptions")
              .select("id, razorpay_subscription_id, status, created_at")
              .in("status", OPEN_SUBSCRIPTION_STATUSES)
              .order("id")
              .range(from, to),
        )
      },
      async listBillingOwners() {
        const rows = await readAllRows<{ created_by: string }>("listing owners", (from, to) =>
          admin
            .from("billing_subscriptions")
            .select("created_by")
            .not("created_by", "is", null)
            .order("id")
            .range(from, to),
        )
        return [...new Set(rows.map((r) => r.created_by))]
      },
      async syncOwner(ownerId) {
        const { data, error } = await admin.rpc("billing_sync_owner", { p_owner: ownerId })
        if (error) throw new Error(`owner sync failed: ${error.message}`)
        return typeof data === "string" ? data : "unchanged"
      },
      razorpay: createRazorpayApi(config),
      applyEvent: createApplyEvent(admin),
    },
    opts,
  )

  // Time-based notices (plan ending in 3 days, plan ended) and any email that
  // didn't go out earlier. Skipped on a dry run: they can't be undone.
  if (opts.dryRun) return { ...result, notices: 0, emailsSent: 0, emailsFailed: 0, addonsGranted: 0, addonsFailed: 0 }

  // Add-on orders from the last 2 days that were never confirmed: ask Razorpay
  // and add the ones that were really paid.
  const addons = { granted: 0, failed: 0 }
  try {
    const razorpay = createRazorpayApi(config)
    const applyAddon = createApplyAddon(admin)
    const addonStore = createAddonStore(admin)
    for (const order of await listRecentOpenAddonOrders(admin)) {
      try {
        const settled = await settleAddonOrder(order, { store: addonStore, razorpay, applyAddon })
        if (settled.status === "granted") addons.granted++
        // Paid at Razorpay but not added: counted as a failure so the team is alerted.
        else if (settled.result.startsWith("refused:")) addons.failed++
      } catch (error) {
        addons.failed++
        console.error("[billing-reconcile] Couldn't check an add-on order:", error instanceof Error ? error.message : String(error))
      }
    }
  } catch (error) {
    addons.failed++
    console.error("[billing-reconcile] Add-on check failed:", error instanceof Error ? error.message : String(error))
  }

  const notices = await emitBillingNotices(admin)
  const emails = await sendBillingNoticeEmails(admin)
  return {
    ...result,
    notices,
    emailsSent: emails.sent,
    emailsFailed: emails.failed,
    addonsGranted: addons.granted,
    addonsFailed: addons.failed,
  }
}
