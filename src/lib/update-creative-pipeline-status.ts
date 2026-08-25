import type { SupabaseClient } from "@supabase/supabase-js"

import {
  deriveProjectBriefStatusFromCreatives,
  getCreativePipelineRank,
  normalizeCreativePipelineStatus,
  type CreativePipelineStatus,
  type ProjectBriefStatus,
} from "@/lib/creative-pipeline-status"

async function preserveCompletedBriefStatus(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectBriefStatus | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("brief_status")
    .eq("id", projectId)
    .single()

  if (project?.brief_status === "completed") {
    return "completed"
  }

  return null
}

/**
 * Persist a creative pipeline status and roll project brief_status up from all creatives.
 */
export async function updateCreativePipelineStatus(
  supabase: SupabaseClient,
  creativeId: string,
  projectId: string,
  pipelineStatus: CreativePipelineStatus
): Promise<ProjectBriefStatus> {
  const { error: creativeError } = await supabase
    .from("creatives")
    .update({ status: pipelineStatus })
    .eq("id", creativeId)

  if (creativeError) {
    throw creativeError
  }

  const { data: projectCreatives, error: listError } = await supabase
    .from("creatives")
    .select("status")
    .eq("project_id", projectId)

  if (listError) {
    throw listError
  }

  const preserved = await preserveCompletedBriefStatus(supabase, projectId)
  if (preserved) {
    return preserved
  }

  const briefStatus = deriveProjectBriefStatusFromCreatives(
    (projectCreatives ?? []).map((row) => row.status)
  )

  const { error: projectError } = await supabase
    .from("projects")
    .update({ brief_status: briefStatus })
    .eq("id", projectId)

  if (projectError) {
    throw projectError
  }

  return briefStatus
}

/**
 * Move a creative forward to targetStatus only if it is not already at or past that stage.
 * Returns the new project brief_status when updated, otherwise null.
 */
export async function advanceCreativePipelineStatus(
  supabase: SupabaseClient,
  creativeId: string,
  projectId: string,
  targetStatus: CreativePipelineStatus
): Promise<ProjectBriefStatus | null> {
  const { data: creative, error } = await supabase
    .from("creatives")
    .select("status")
    .eq("id", creativeId)
    .single()

  if (error || !creative) {
    throw error ?? new Error("Creative not found")
  }

  const currentStatus = normalizeCreativePipelineStatus(creative.status)
  if (
    getCreativePipelineRank(currentStatus) >=
    getCreativePipelineRank(targetStatus)
  ) {
    return null
  }

  return updateCreativePipelineStatus(
    supabase,
    creativeId,
    projectId,
    targetStatus
  )
}

/**
 * After upload or bulk creative changes, sync project brief_status from creatives.
 */
export async function syncProjectBriefStatusFromCreatives(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectBriefStatus> {
  const { data: projectCreatives, error: listError } = await supabase
    .from("creatives")
    .select("status")
    .eq("project_id", projectId)

  if (listError) {
    throw listError
  }

  const preserved = await preserveCompletedBriefStatus(supabase, projectId)
  if (preserved) {
    return preserved
  }

  const briefStatus = deriveProjectBriefStatusFromCreatives(
    (projectCreatives ?? []).map((row) => row.status)
  )

  const { error: projectError } = await supabase
    .from("projects")
    .update({ brief_status: briefStatus })
    .eq("id", projectId)

  if (projectError) {
    throw projectError
  }

  return briefStatus
}
