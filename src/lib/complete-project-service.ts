import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getProjectCompletionBlockers,
  isProjectReadyToComplete,
  type ProjectCompletionBlockers,
} from "@/lib/project-completion"
import { TRIAL_EXPIRED_CODE, TRIAL_EXPIRED_MESSAGE } from "@/lib/plans"
import { PermissionDeniedError, requirePermission } from "@/lib/require-permission"
import { touchClientActivity } from "@/lib/touch-client-activity"
import { isOrgTrialExpired } from "@/lib/trial"

type ProjectRow = {
  id: string
  client_id: string | null
  brief_status: string | null
  project_deliverables: unknown
}

async function loadProjectForCompletion(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  project: ProjectRow
  blockers: ProjectCompletionBlockers
} | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, client_id, brief_status, project_deliverables")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    return null
  }

  const { data: creatives, error: creativesError } = await supabase
    .from("creatives")
    .select("status")
    .eq("project_id", projectId)

  if (creativesError) {
    return null
  }

  const deliverables = (
    (project.project_deliverables as { status?: string }[]) || []
  ).map((item) => ({ status: item.status || "pending" }))

  const blockers = getProjectCompletionBlockers(creatives || [], deliverables)

  return { project, blockers }
}

async function markProjectCompleted(
  supabase: SupabaseClient,
  project: ProjectRow
): Promise<boolean> {
  const { error: updateError } = await supabase
    .from("projects")
    .update({ brief_status: "completed" })
    .eq("id", project.id)

  if (updateError) {
    return false
  }

  if (project.client_id) {
    await touchClientActivity(supabase, project.client_id)
  }

  return true
}

export class CompleteProjectError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = "CompleteProjectError"
  }
}

export interface CompleteProjectResult {
  briefStatus: "completed"
  blockers: ProjectCompletionBlockers
  wasReady: boolean
}

export interface TryAutoCompleteProjectResult {
  completed: boolean
  briefStatus: "completed" | null
}

/**
 * Step 9: auto-complete when every creative is approved and deliverables are done.
 */
export async function tryAutoCompleteProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<TryAutoCompleteProjectResult> {
  const loaded = await loadProjectForCompletion(supabase, projectId)

  if (!loaded) {
    return { completed: false, briefStatus: null }
  }

  const { project, blockers } = loaded

  if (project.brief_status === "completed") {
    return { completed: false, briefStatus: null }
  }

  if (!isProjectReadyToComplete(blockers)) {
    return { completed: false, briefStatus: null }
  }

  // Runs when a Room is opened: after the trial it quietly does nothing
  // (the database would refuse the status change).
  if (project.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("organization_id")
      .eq("id", project.client_id)
      .maybeSingle()
    if (await isOrgTrialExpired(supabase, client?.organization_id)) {
      return { completed: false, briefStatus: null }
    }
  }

  const didComplete = await markProjectCompleted(supabase, project)

  return {
    completed: didComplete,
    briefStatus: didComplete ? "completed" : null,
  }
}

export async function completeProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<CompleteProjectResult> {
  let organizationId: string
  try {
    const ctx = await requirePermission(supabase, userId, "add_brief")
    organizationId = ctx.organizationId
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      throw new CompleteProjectError(
        "You do not have permission to mark a project as complete",
        403
      )
    }
    throw error
  }

  const loaded = await loadProjectForCompletion(supabase, projectId)

  if (!loaded) {
    throw new CompleteProjectError("Project not found", 404)
  }

  const { project, blockers } = loaded

  if (project.brief_status === "completed") {
    throw new CompleteProjectError("Project is already completed", 400)
  }

  const { data: client } = project.client_id
    ? await supabase
        .from("clients")
        .select("id, organization_id")
        .eq("id", project.client_id)
        .single()
    : { data: null }

  if (!client || client.organization_id !== organizationId) {
    throw new CompleteProjectError("Project not found", 404)
  }

  if (await isOrgTrialExpired(supabase, organizationId)) {
    throw new CompleteProjectError(TRIAL_EXPIRED_MESSAGE, 402, TRIAL_EXPIRED_CODE)
  }

  if (blockers.totalCreatives === 0) {
    throw new CompleteProjectError(
      "Add at least one creative before completing the project",
      400
    )
  }

  const wasReady = isProjectReadyToComplete(blockers)
  const didComplete = await markProjectCompleted(supabase, project)

  if (!didComplete) {
    throw new CompleteProjectError(
      "Could not mark the project as complete. Please try again.",
      500
    )
  }

  return {
    briefStatus: "completed",
    blockers,
    wasReady,
  }
}
