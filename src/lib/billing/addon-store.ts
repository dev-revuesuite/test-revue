// Server only: database access for add-on purchases (service role; users can't
// write billing tables). Callers must have authenticated the user first.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { AddonOrderRow, AddonStore, ApplyAddonFn } from "@/lib/billing/addon-service"

export function createAddonStore(admin: SupabaseClient): AddonStore {
  return {
    async isOwner(organizationId, userId) {
      const { data, error } = await admin
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .eq("created_by", userId)
        .maybeSingle()
      if (error) throw new Error(`owner check failed: ${error.message}`)
      return Boolean(data)
    },

    async isViewOnly(organizationId) {
      const { data, error } = await admin.rpc("org_trial_expired", { p_organization_id: organizationId })
      if (error) throw new Error(`plan check failed: ${error.message}`)
      return data === true
    },

    async insertOrder(row) {
      const { error } = await admin.from("billing_addon_orders").insert(row)
      if (error) console.error("[billing-addon] Saving the order failed:", error.code, error.message)
      return !error
    },

    async getOrder(razorpayOrderId) {
      const { data, error } = await admin
        .from("billing_addon_orders")
        .select("razorpay_order_id, amount_paise, status, created_by")
        .eq("razorpay_order_id", razorpayOrderId)
        .maybeSingle()
      if (error) throw new Error(`order lookup failed: ${error.message}`)
      return (data as AddonOrderRow | null) ?? null
    },
  }
}

/** The one way an add-on is granted (billing_apply_addon_payment). */
export function createApplyAddon(admin: SupabaseClient): ApplyAddonFn {
  return async ({ orderId, paymentId, amountPaise, eventId, payload }) => {
    const { data, error } = await admin.rpc("billing_apply_addon_payment", {
      p_razorpay_order_id: orderId,
      p_razorpay_payment_id: paymentId,
      p_amount_paise: amountPaise,
      p_event_id: eventId,
      p_payload: payload,
    })
    return { data, error }
  }
}

/** Unpaid add-on orders from the last 2 days (the nightly check asks Razorpay about them). */
export async function listRecentOpenAddonOrders(admin: SupabaseClient): Promise<AddonOrderRow[]> {
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from("billing_addon_orders")
    .select("razorpay_order_id, amount_paise, status, created_by")
    .eq("status", "created")
    .gt("created_at", since)
    .limit(200)
  if (error) throw new Error(`listing add-on orders failed: ${error.message}`)
  return (data ?? []) as AddonOrderRow[]
}
