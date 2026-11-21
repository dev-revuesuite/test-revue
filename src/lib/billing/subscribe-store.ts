// Server only: database access for starting a checkout. Uses the service-role
// client because users can't write billing tables (RLS). Callers must have
// authenticated the user first; ownership is checked here against the DB.
// Subscriptions belong to the owner's account (billing v3), so they are looked
// up by owner (created_by), not by workspace.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { OpenSubscription, SubscribeStore } from "@/lib/billing/subscribe-service"
import type { CancelStore } from "@/lib/billing/cancel-service"
import type { SyncStore } from "@/lib/billing/sync-service"

// Same list as the billing_subscriptions_one_live_per_org index.
export const OPEN_SUBSCRIPTION_STATUSES = ["created", "authenticated", "active", "pending", "halted", "paused"]

export function createSubscribeStore(admin: SupabaseClient): SubscribeStore & SyncStore & CancelStore {
  return {
    async getLatestSubscription(ownerId) {
      const { data, error } = await admin
        .from("billing_subscriptions")
        .select("id, razorpay_subscription_id, razorpay_plan_id, status")
        .eq("created_by", ownerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`subscription lookup failed: ${error.message}`)
      return (data as OpenSubscription | null) ?? null
    },

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

    async getOrgPlanId(organizationId) {
      const { data, error } = await admin
        .from("organization_plans")
        .select("plan_id")
        .eq("organization_id", organizationId)
        .maybeSingle()
      if (error) throw new Error(`plan lookup failed: ${error.message}`)
      return (data?.plan_id as string | undefined) ?? null
    },

    async isPlanFromBilling(organizationId) {
      const { data, error } = await admin
        .from("organization_plans")
        .select("billing_subscription_id")
        .eq("organization_id", organizationId)
        .maybeSingle()
      if (error) throw new Error(`plan lookup failed: ${error.message}`)
      return Boolean(data?.billing_subscription_id)
    },

    async getOpenSubscription(ownerId) {
      const { data, error } = await admin
        .from("billing_subscriptions")
        .select("id, razorpay_subscription_id, razorpay_plan_id, status, cancel_at_period_end, current_period_end")
        .eq("created_by", ownerId)
        .in("status", OPEN_SUBSCRIPTION_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`subscription lookup failed: ${error.message}`)
      return (data as OpenSubscription | null) ?? null
    },

    async insertSubscription(row) {
      const { error } = await admin.from("billing_subscriptions").insert(row)
      if (!error) return { ok: true }
      console.error("[billing-subscribe] Saving subscription failed:", error.code, error.message)
      return { ok: false, conflict: error.code === "23505" }
    },

    async endGraceNow(id) {
      const { error } = await admin
        .from("billing_subscriptions")
        .update({ grace_ends_at: new Date().toISOString() })
        .eq("id", id)
        .not("grace_ends_at", "is", null)
      if (error) throw new Error(`ending the grace period failed: ${error.message}`)
      const { error: syncError } = await admin.rpc("billing_sync_org_plan", { p_subscription_id: id })
      if (syncError) throw new Error(`plan update failed: ${syncError.message}`)
    },

    async getPaidUntil(id) {
      const { data, error } = await admin.from("billing_subscriptions").select("paid_until").eq("id", id).maybeSingle()
      if (error) throw new Error(`paid-until lookup failed: ${error.message}`)
      return (data?.paid_until as string | null | undefined) ?? null
    },
  }
}
