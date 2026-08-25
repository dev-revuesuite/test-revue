import type { SupabaseClient } from "@supabase/supabase-js"

import { canApproveCreative } from "@/lib/creative-pipeline-status"
import { getUserRole } from "@/lib/get-user-role"
import { advanceCreativePipelineStatus } from "@/lib/update-creative-pipeline-status"
import { tryAutoCompleteProject } from "@/lib/complete-project-service"

export class ApproveCreativeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ApproveCreativeError"
  }
}

async function assertClientProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  projectId: string
): Promise<void> {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!membership) {
    throw new ApproveCreativeError("You do not have access to this project", 403)
  }

  const { data: clientAccess } = await supabase
    .from("project_client_users")
    .select("id")
    .eq("project_id", projectId)
    .eq("client_user_id", membership.id)
    .maybeSingle()

  if (!clientAccess) {
    throw new ApproveCreativeError("You do not have access to this project", 403)
  }
}

export async function approveCreative(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  creativeId: string
): Promise<{ briefStatus: string; projectCompleted: boolean }> {
  const { role, organizationId } = await getUserRole(supabase, userId)

  if (!organizationId) {
    throw new ApproveCreativeError("No active organization", 403)
  }

  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("id, status, project_id")
    .eq("id", creativeId)
    .eq("project_id", projectId)
    .single()

  if (creativeError || !creative) {
    throw new ApproveCreativeError("Creative not found", 404)
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    throw new ApproveCreativeError("Project not found", 404)
  }

  const { data: client } = project.client_id
    ? await supabase
        .from("clients")
        .select("id, organization_id")
        .eq("id", project.client_id)
        .single()
    : { data: null }

  if (!client || client.organization_id !== organizationId) {
    throw new ApproveCreativeError("Project not found", 404)
  }

  if (role === "client") {
    await assertClientProjectAccess(
      supabase,
      userId,
      organizationId,
      projectId
    )
  } else if (role !== "admin" && role !== "designer") {
    throw new ApproveCreativeError(
      "Only clients, admins, and designers can approve creatives",
      403
    )
  }

  if (!canApproveCreative(creative.status)) {
    throw new ApproveCreativeError(
      "This creative must be shared with the client before it can be approved",
      400
    )
  }

  const briefStatus = await advanceCreativePipelineStatus(
    supabase,
    creativeId,
    projectId,
    "iteration_approved"
  )

  const autoComplete = await tryAutoCompleteProject(supabase, projectId)

  return {
    briefStatus: autoComplete.briefStatus ?? briefStatus ?? "iteration_approved",
    projectCompleted: autoComplete.completed,
  }
}
