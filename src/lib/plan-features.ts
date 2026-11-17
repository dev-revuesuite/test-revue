import type { SupabaseClient } from "@supabase/supabase-js"

/** Plan features the app shows locks for (keys of `plans.features`). */
export type PlanFeatureKey = "productive_mode" | "role_based_permissions" | "image_export"

export type PlanFeatures = Record<PlanFeatureKey, boolean>

/** Used when there's no organization, or before the v5 migration is applied. */
export const ALL_PLAN_FEATURES_INCLUDED: PlanFeatures = {
  productive_mode: true,
  role_based_permissions: true,
  image_export: true,
}

export const PLAN_LOCK_LABEL = "Available on Plus"

/**
 * The active organization's plan features, from the same database function the
 * enforcement uses (org_plan_features). The database stays the authority: these
 * only drive locks in the UI.
 */
export async function getPlanFeatures(
  supabase: SupabaseClient,
  organizationId: string | null | undefined
): Promise<PlanFeatures> {
  if (!organizationId) return ALL_PLAN_FEATURES_INCLUDED

  const { data, error } = await supabase.rpc("org_plan_features", {
    p_organization_id: organizationId,
  })

  if (error || !data || typeof data !== "object") {
    if (error && error.code !== "PGRST202") {
      console.error("[plan-features] Failed to load plan features", { error: error.message })
    }
    return ALL_PLAN_FEATURES_INCLUDED
  }

  const row = data as Partial<Record<PlanFeatureKey, unknown>>
  return {
    productive_mode: row.productive_mode !== false,
    role_based_permissions: row.role_based_permissions !== false,
    image_export: row.image_export !== false,
  }
}
