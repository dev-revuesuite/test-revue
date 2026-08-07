import type { SupabaseClient } from "@supabase/supabase-js"

import type { QuickAnalysisRecord } from "@/types/quick-analysis"
import { resolveIterationMediaType, type MediaType } from "@/lib/media-type"

export class QuickAnalysisAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "QuickAnalysisAccessError"
  }
}

export interface QuickAnalysisForRun {
  id: string
  organization_id: string
  file_name: string
  storage_path: string
  media_type: MediaType
  page_count: number | null
}

async function assertOrgTeamMember(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { data: isMember, error } = await supabase.rpc(
    "user_is_org_team_member",
    { p_organization_id: organizationId }
  )

  if (error) {
    throw new QuickAnalysisAccessError("Failed to verify organization access", 500)
  }

  if (!isMember) {
    throw new QuickAnalysisAccessError(
      "Only admins and designers can use Quick AI Analysis",
      403
    )
  }
}

async function assertCanAccessQuickAnalysisId(
  supabase: SupabaseClient,
  quickAnalysisId: string
): Promise<void> {
  const { data: canAccess, error } = await supabase.rpc(
    "user_can_access_quick_analysis",
    { p_quick_analysis_id: quickAnalysisId }
  )

  if (error) {
    throw new QuickAnalysisAccessError("Failed to verify quick analysis access", 500)
  }

  if (!canAccess) {
    throw new QuickAnalysisAccessError("Quick analysis not found", 404)
  }
}

export async function assertCanCreateQuickAnalysis(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<void> {
  if (!organizationId.trim()) {
    throw new QuickAnalysisAccessError("organizationId is required", 400)
  }

  await assertOrgTeamMember(supabase, organizationId)

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle()

  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("created_by", userId)
    .maybeSingle()

  if (!ownedOrg && membership?.role === "client") {
    throw new QuickAnalysisAccessError(
      "Only admins and designers can use Quick AI Analysis",
      403
    )
  }
}

export async function assertCanAccessQuickAnalysis(
  supabase: SupabaseClient,
  quickAnalysisId: string
): Promise<QuickAnalysisForRun> {
  await assertCanAccessQuickAnalysisId(supabase, quickAnalysisId)

  const { data, error } = await supabase
    .from("quick_analyses")
    .select(
      "id, organization_id, file_name, storage_path, media_type, page_count"
    )
    .eq("id", quickAnalysisId)
    .single()

  if (error || !data) {
    throw new QuickAnalysisAccessError("Quick analysis not found", 404)
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    file_name: data.file_name,
    storage_path: data.storage_path,
    media_type: resolveIterationMediaType(data.media_type, data.storage_path),
    page_count: data.page_count,
  }
}

export async function assertCanManageQuickAnalysisSuggestion(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<{ suggestionId: string; quickAnalysisId: string }> {
  const { data: suggestion, error } = await supabase
    .from("quick_analysis_suggestions")
    .select("id, quick_analysis_id")
    .eq("id", suggestionId)
    .single()

  if (error || !suggestion) {
    throw new QuickAnalysisAccessError("AI suggestion not found", 404)
  }

  await assertCanAccessQuickAnalysisId(supabase, suggestion.quick_analysis_id)

  return {
    suggestionId: suggestion.id,
    quickAnalysisId: suggestion.quick_analysis_id,
  }
}

export function buildQuickAnalysisStoragePath(
  organizationId: string,
  quickAnalysisId: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[/\\]/g, "_").trim()
  return `${organizationId}/${quickAnalysisId}/${sanitized}`
}

export function assertValidStoragePath(
  storagePath: string,
  organizationId: string,
  quickAnalysisId: string
): void {
  const expectedPrefix = `${organizationId}/${quickAnalysisId}/`
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new QuickAnalysisAccessError("Invalid storage path for quick analysis", 400)
  }
}

export type { QuickAnalysisRecord }
