import type { SupabaseClient } from "@supabase/supabase-js"

import {
  deriveProjectBriefStatusFromCreatives,
  getCreativePipelineRank,
  normalizeCreativePipelineStatus,
  normalizeProjectBriefStatus,
  type CreativePipelineStatus,
} from "@/lib/creative-pipeline-status"

export interface BackfillPipelineResult {
  creativesUpdated: number
  projectsUpdated: number
}

type CreativeRow = {
  id: string
  project_id: string
  status: string | null
  thumbnail_url: string | null
}

type CreativeActivity = {
  hasTeamFeedback: boolean
  hasClientFeedback: boolean
  hasTeamDrawing: boolean
  hasAiAnalysis: boolean
}

function maxPipelineStatus(
  current: CreativePipelineStatus,
  target: CreativePipelineStatus
): CreativePipelineStatus {
  return getCreativePipelineRank(target) > getCreativePipelineRank(current)
    ? target
    : current
}

function inferCreativeStatus(
  creative: CreativeRow,
  activity: CreativeActivity | undefined
): CreativePipelineStatus {
  let status = normalizeCreativePipelineStatus(creative.status)

  if (status === "brief_received" && creative.thumbnail_url) {
    status = "qc_pending"
  }

  if (!activity) {
    return status
  }

  if (
    activity.hasTeamFeedback ||
    activity.hasTeamDrawing ||
    activity.hasAiAnalysis
  ) {
    status = maxPipelineStatus(status, "review_qc")
  }

  if (activity.hasClientFeedback) {
    status = maxPipelineStatus(status, "iteration_shared")
    status = maxPipelineStatus(status, "feedback_received")
  }

  return status
}

async function loadCreativeActivity(
  supabase: SupabaseClient,
  iterationIds: string[]
): Promise<Map<string, CreativeActivity>> {
  const activityByIteration = new Map<string, CreativeActivity>()

  if (iterationIds.length === 0) {
    return activityByIteration
  }

  const ensure = (iterationId: string): CreativeActivity => {
    const existing = activityByIteration.get(iterationId)
    if (existing) return existing
    const created = {
      hasTeamFeedback: false,
      hasClientFeedback: false,
      hasTeamDrawing: false,
      hasAiAnalysis: false,
    }
    activityByIteration.set(iterationId, created)
    return created
  }

  const [{ data: feedbacks }, { data: drawings }, { data: aiRows }] =
    await Promise.all([
      supabase
        .from("feedbacks")
        .select("iteration_id, source")
        .in("iteration_id", iterationIds),
      supabase
        .from("drawings")
        .select("iteration_id")
        .in("iteration_id", iterationIds),
      supabase
        .from("ai_suggestions")
        .select("iteration_id")
        .in("iteration_id", iterationIds),
    ])

  for (const feedback of feedbacks ?? []) {
    const activity = ensure(feedback.iteration_id)
    if (feedback.source === "client") {
      activity.hasClientFeedback = true
    } else {
      activity.hasTeamFeedback = true
    }
  }

  for (const drawing of drawings ?? []) {
    const activity = ensure(drawing.iteration_id)
    activity.hasTeamDrawing = true
  }

  for (const aiRow of aiRows ?? []) {
    const activity = ensure(aiRow.iteration_id)
    activity.hasAiAnalysis = true
  }

  return activityByIteration
}

/**
 * Step 12: normalize legacy creative statuses and re-sync project brief_status.
 */
export async function backfillCreativePipelineForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BackfillPipelineResult> {
  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", organizationId)

  const clientIds = clients?.map((client) => client.id) ?? []
  if (clientIds.length === 0) {
    return { creativesUpdated: 0, projectsUpdated: 0 }
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, brief_status")
    .in("client_id", clientIds)

  const projectRows = projects ?? []
  const projectIds = projectRows.map((project) => project.id)
  if (projectIds.length === 0) {
    return { creativesUpdated: 0, projectsUpdated: 0 }
  }

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, project_id, status, thumbnail_url")
    .in("project_id", projectIds)

  const creativeRows = (creatives ?? []) as CreativeRow[]
  if (creativeRows.length === 0) {
    return { creativesUpdated: 0, projectsUpdated: 0 }
  }

  const { data: iterations } = await supabase
    .from("iterations")
    .select("id, creative_id")
    .in(
      "creative_id",
      creativeRows.map((creative) => creative.id)
    )

  const iterationIds = (iterations ?? []).map((iteration) => iteration.id)
  const activityByIteration = await loadCreativeActivity(supabase, iterationIds)

  const activityByCreative = new Map<string, CreativeActivity>()
  for (const iteration of iterations ?? []) {
    const iterationActivity = activityByIteration.get(iteration.id)
    if (!iterationActivity) continue

    const merged = activityByCreative.get(iteration.creative_id) ?? {
      hasTeamFeedback: false,
      hasClientFeedback: false,
      hasTeamDrawing: false,
      hasAiAnalysis: false,
    }

    merged.hasTeamFeedback =
      merged.hasTeamFeedback || iterationActivity.hasTeamFeedback
    merged.hasClientFeedback =
      merged.hasClientFeedback || iterationActivity.hasClientFeedback
    merged.hasTeamDrawing =
      merged.hasTeamDrawing || iterationActivity.hasTeamDrawing
    merged.hasAiAnalysis =
      merged.hasAiAnalysis || iterationActivity.hasAiAnalysis

    activityByCreative.set(iteration.creative_id, merged)
  }

  let creativesUpdated = 0
  const statusesByProject = new Map<string, CreativePipelineStatus[]>()

  for (const creative of creativeRows) {
    const nextStatus = inferCreativeStatus(
      creative,
      activityByCreative.get(creative.id)
    )
    const currentStatus = normalizeCreativePipelineStatus(creative.status)

    const projectStatuses = statusesByProject.get(creative.project_id) ?? []
    projectStatuses.push(nextStatus)
    statusesByProject.set(creative.project_id, projectStatuses)

    if (nextStatus !== currentStatus) {
      const { error } = await supabase
        .from("creatives")
        .update({ status: nextStatus })
        .eq("id", creative.id)

      if (!error) {
        creativesUpdated += 1
      }
    }
  }

  let projectsUpdated = 0

  for (const project of projectRows) {
    const creativeStatuses = statusesByProject.get(project.id) ?? []
    if (creativeStatuses.length === 0) continue

    if (project.brief_status === "completed") {
      continue
    }

    const nextBriefStatus =
      deriveProjectBriefStatusFromCreatives(creativeStatuses)
    const currentBriefStatus = normalizeProjectBriefStatus(project.brief_status)

    if (nextBriefStatus !== currentBriefStatus) {
      const { error } = await supabase
        .from("projects")
        .update({ brief_status: nextBriefStatus })
        .eq("id", project.id)

      if (!error) {
        projectsUpdated += 1
      }
    }
  }

  return { creativesUpdated, projectsUpdated }
}
