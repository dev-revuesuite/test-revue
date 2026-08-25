import type { SupabaseClient } from "@supabase/supabase-js"

function projectMemberRoleForOrgRole(
  orgRole: string | null | undefined
): string {
  if (orgRole === "admin" || orgRole === "owner") {
    return "manager"
  }
  return "member"
}

/**
 * Grant the signed-in user a project_members row for RLS on iterations,
 * feedbacks, drawings, etc.
 */
export async function ensureProjectMemberAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, client_id, clients(organization_id)")
    .eq("id", projectId)
    .single()

  if (projectError || !project?.client_id) {
    return false
  }

  const clientRow = project.clients as
    | { organization_id: string }
    | { organization_id: string }[]
    | null
  const organizationId = Array.isArray(clientRow)
    ? clientRow[0]?.organization_id
    : clientRow?.organization_id
  if (!organizationId) {
    return false
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError || !membership) {
    return false
  }

  const { data: existingProjectMember } = await supabase
    .from("project_members")
    .select("member_id")
    .eq("project_id", projectId)
    .eq("member_id", membership.id)
    .maybeSingle()

  if (existingProjectMember) {
    return true
  }

  const { error: upsertError } = await supabase.from("project_members").upsert(
    {
      project_id: projectId,
      member_id: membership.id,
      role: projectMemberRoleForOrgRole(membership.role),
    },
    { onConflict: "project_id,member_id" }
  )

  if (upsertError) {
    // Best-effort only — do not block uploads when the row already exists or
    // RLS rejects upsert; iteration access may still work via org role.
    console.warn("Could not ensure project member access:", upsertError)
    return false
  }

  return true
}

export async function ensureProjectMemberAccessForCreative(
  supabase: SupabaseClient,
  creativeId: string,
  userId: string
): Promise<boolean> {
  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("project_id")
    .eq("id", creativeId)
    .single()

  if (creativeError || !creative?.project_id) {
    return false
  }

  return ensureProjectMemberAccess(supabase, creative.project_id, userId)
}

/**
 * Assign explicit team rows after ensuring the creator always has access.
 */
export async function assignProjectTeamMembers(
  supabase: SupabaseClient,
  projectId: string,
  creatorUserId: string | null | undefined,
  members: { project_id: string; member_id: string; role: string }[]
): Promise<void> {
  if (creatorUserId) {
    await ensureProjectMemberAccess(supabase, projectId, creatorUserId)
  }

  if (members.length === 0) {
    return
  }

  const { error } = await supabase
    .from("project_members")
    .upsert(members, { onConflict: "project_id,member_id" })

  if (error) {
    throw error
  }
}
