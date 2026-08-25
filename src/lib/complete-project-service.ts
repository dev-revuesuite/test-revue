import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getProjectCompletionBlockers,
  isProjectReadyToComplete,
  type ProjectCompletionBlockers,
} from "@/lib/project-completion"
import { getUserRole } from "@/lib/get-user-role"
import { touchClientActivity } from "@/lib/touch-client-activity"

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
    readonly status: number
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
  const { role, organizationId } = await getUserRole(supabase, userId)

  if (role !== "admin") {
    throw new CompleteProjectError(
      "Only admins can mark a project as complete",
      403
    )
  }

  if (!organizationId) {
    throw new CompleteProjectError("No active organization", 403)
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
