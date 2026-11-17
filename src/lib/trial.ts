import type { SupabaseClient } from "@supabase/supabase-js"

import { isMissingDbFunctionError, type TrialStatus } from "@/lib/plans"

export type { TrialStatus }

export interface OrgTrialInfo {
  status: TrialStatus
  /** ISO timestamp; null for paid and legacy organizations. */
  endsAt: string | null
  /** Whole days left (rounded up) during the trial, 0 once expired, else null. */
  daysLeft: number | null
}

/** No trial applies: before the trial migration, or for legacy organizations. */
export const NO_TRIAL: OrgTrialInfo = { status: "legacy", endsAt: null, daysLeft: null }

const TRIAL_STATUSES: ReadonlySet<string> = new Set(["trial", "expired", "paid", "legacy"])

/**
 * The organization's free-trial status (get_org_trial_status). The database
 * enforces the trial; this only drives app behaviour, so any failure falls back
 * to NO_TRIAL instead of blocking the user.
 */
export async function getOrgTrialStatus(
  supabase: SupabaseClient,
  organizationId: string | null | undefined
): Promise<OrgTrialInfo> {
  if (!organizationId) return NO_TRIAL

  const { data, error } = await supabase.rpc("get_org_trial_status", {
    p_organization_id: organizationId,
  })

  if (error) {
    if (!isMissingDbFunctionError(error)) {
      console.error("[trial] Failed to load trial status", { error: error.message })
    }
    return NO_TRIAL
  }

  const row = data as { status?: unknown; ends_at?: unknown; days_left?: unknown } | null
  if (!row || typeof row.status !== "string" || !TRIAL_STATUSES.has(row.status)) {
    return NO_TRIAL
  }

  return {
    status: row.status as TrialStatus,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    daysLeft: typeof row.days_left === "number" ? row.days_left : null,
  }
}

export async function isOrgTrialExpired(
  supabase: SupabaseClient,
  organizationId: string | null | undefined
): Promise<boolean> {
  return (await getOrgTrialStatus(supabase, organizationId)).status === "expired"
}
