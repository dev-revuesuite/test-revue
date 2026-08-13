import type { SupabaseClient } from "@supabase/supabase-js"

import { appRoute } from "@/lib/base-path"
import { getUserRole } from "@/lib/get-user-role"
import { touchClientActivity } from "@/lib/touch-client-activity"
import type {
  ShareCandidate,
  ShareCandidateKind,
  ShareCreativeCandidatesResponse,
  ShareCreativeSendResponse,
} from "@/types/share-creative"

export class ShareCreativeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ShareCreativeError"
  }
}

function isInternalDatabaseError(message: string, code?: string | null): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("pgrst") ||
    code === "42501"
  )
}

function toUserFacingShareError(
  error: { message?: string; code?: string | null },
  fallback: string
): ShareCreativeError {
  const message = error.message?.trim() || fallback
  if (isInternalDatabaseError(message, error.code)) {
    return new ShareCreativeError(fallback, 500)
  }
  return new ShareCreativeError(message, 500)
}

interface ProjectContext {
  organizationId: string
  projectId: string
  projectName: string
  clientId: string | null
  creativeId: string
  creativeName: string
  actorUserId: string
  actorName: string
  actorRole: "admin" | "designer" | "client"
}

async function loadProjectContext(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  creativeId: string
): Promise<ProjectContext> {
  const { role, organizationId } = await getUserRole(supabase, userId)

  if (!organizationId) {
    throw new ShareCreativeError("No active organization", 403)
  }

  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("id, name, project_id")
    .eq("id", creativeId)
    .eq("project_id", projectId)
    .single()

  if (creativeError || !creative) {
    throw new ShareCreativeError("Creative not found", 404)
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    throw new ShareCreativeError("Project not found", 404)
  }

  const { data: client } = project.client_id
    ? await supabase
        .from("clients")
        .select("id, organization_id")
        .eq("id", project.client_id)
        .single()
    : { data: null }

  if (!client || client.organization_id !== organizationId) {
    throw new ShareCreativeError("Project not found", 404)
  }

  if (role === "client") {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!membership) {
      throw new ShareCreativeError("You do not have access to this project", 403)
    }

    const { data: clientAccess } = await supabase
      .from("project_client_users")
      .select("id")
      .eq("project_id", projectId)
      .eq("client_user_id", membership.id)
      .maybeSingle()

    if (!clientAccess) {
      throw new ShareCreativeError("You do not have access to this project", 403)
    }
  }

  const { data: actorProfile } = await supabase
    .from("organization_members")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle()

  const { data: actorAuthProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle()

  const actorName =
    actorProfile?.name?.trim() ||
    actorAuthProfile?.full_name?.trim() ||
    "Someone"

  return {
    organizationId,
    projectId,
    projectName: project.name || "Project",
    clientId: project.client_id,
    creativeId,
    creativeName: creative.name || "Creative",
    actorUserId: userId,
    actorName,
    actorRole: role,
  }
}

function buildSharePath(projectId: string, creativeId: string): string {
  const params = new URLSearchParams({
    projectId,
    creativeId,
  })
  return appRoute(`/revue?${params.toString()}`)
}

function memberKind(role: string | null): ShareCandidateKind {
  return role === "client" ? "client" : "team"
}

export async function getShareCandidates(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  creativeId: string
): Promise<ShareCreativeCandidatesResponse> {
  const context = await loadProjectContext(
    supabase,
    userId,
    projectId,
    creativeId
  )

  const { data: teamMembersRaw } = await supabase
    .from("organization_members")
    .select("id, user_id, name, email, avatar_url, role")
    .eq("organization_id", context.organizationId)
    .neq("role", "client")
    .not("name", "is", null)
    .not("email", "is", null)
    .order("name")

  let clientMembersRaw: {
    id: string
    user_id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
  }[] = []

  if (context.clientId) {
    const { data: clientUserLinks } = await supabase
      .from("client_users")
      .select("user_id")
      .eq("client_id", context.clientId)

    const clientUserIds = (clientUserLinks || []).map((link) => link.user_id)

    if (clientUserIds.length > 0) {
      const { data: clientUsers } = await supabase
        .from("organization_members")
        .select("id, user_id, name, email, avatar_url, role")
        .eq("organization_id", context.organizationId)
        .eq("role", "client")
        .in("user_id", clientUserIds)
        .not("name", "is", null)
        .not("email", "is", null)
        .order("name")

      clientMembersRaw = clientUsers || []
    }
  }

  const { data: projectMembers } = await supabase
    .from("project_members")
    .select("member_id")
    .eq("project_id", projectId)

  const { data: projectClientUsers } = await supabase
    .from("project_client_users")
    .select("client_user_id")
    .eq("project_id", projectId)

  const teamAccessIds = new Set(
    (projectMembers || []).map((row) => row.member_id)
  )
  const clientAccessIds = new Set(
    (projectClientUsers || []).map((row) => row.client_user_id)
  )

  const seenUserIds = new Set<string>()
  const candidates: ShareCandidate[] = []

  const appendCandidate = (member: {
    id: string
    user_id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
  }) => {
    if (!member.name?.trim() || !member.email?.trim()) return
    if (member.user_id === userId) return
    if (seenUserIds.has(member.user_id)) return

    seenUserIds.add(member.user_id)
    const kind = memberKind(member.role)

    candidates.push({
      id: member.id,
      userId: member.user_id,
      name: member.name.trim(),
      email: member.email.trim(),
      avatarUrl: member.avatar_url,
      kind,
      hasAccess:
        kind === "client"
          ? clientAccessIds.has(member.id)
          : teamAccessIds.has(member.id),
    })
  }

  for (const member of teamMembersRaw || []) {
    appendCandidate(member)
  }

  for (const member of clientMembersRaw) {
    appendCandidate(member)
  }

  candidates.sort((a, b) => a.name.localeCompare(b.name))

  return {
    sharePath: buildSharePath(projectId, creativeId),
    creativeName: context.creativeName,
    projectName: context.projectName,
    candidates,
  }
}

async function grantProjectAccess(
  supabase: SupabaseClient,
  context: ProjectContext,
  candidate: ShareCandidate
): Promise<boolean> {
  if (candidate.hasAccess) {
    return false
  }

  if (candidate.kind === "client") {
    if (context.actorRole === "client") {
      throw new ShareCreativeError(
        "Client users cannot grant team access",
        403
      )
    }

    const { error } = await supabase.from("project_client_users").insert({
      project_id: context.projectId,
      client_user_id: candidate.id,
    })

    if (error && error.code !== "23505") {
      throw toUserFacingShareError(
        error,
        "Could not grant client access. Please try again."
      )
    }

    return !error
  }

  const { error } = await supabase.from("project_members").upsert(
    {
      project_id: context.projectId,
      member_id: candidate.id,
      role: "member",
    },
    { onConflict: "project_id,member_id" }
  )

  if (error) {
    throw toUserFacingShareError(
      error,
      "Could not grant project access. Please try again."
    )
  }

  return true
}

async function notifyRecipients(
  supabase: SupabaseClient,
  context: ProjectContext,
  candidates: ShareCandidate[]
): Promise<number> {
  if (candidates.length === 0) return 0

  const link = buildSharePath(context.projectId, context.creativeId)
  const title = `${context.actorName} shared a creative with you`
  const body = `"${context.creativeName}" in ${context.projectName}`

  const { data, error } = await supabase.rpc("notify_creative_shared", {
    p_project_id: context.projectId,
    p_creative_id: context.creativeId,
    p_recipient_user_ids: candidates.map((candidate) => candidate.userId),
    p_title: title,
    p_body: body,
    p_link: link,
    p_metadata: {
      creative_name: context.creativeName,
      project_name: context.projectName,
      project_id: context.projectId,
    },
  })

  if (error) {
    if (
      error.code === "42883" ||
      error.message?.toLowerCase().includes("notify_creative_shared")
    ) {
      throw new ShareCreativeError(
        "Sharing is not fully configured yet. Ask an admin to apply the latest database migration.",
        500
      )
    }

    throw toUserFacingShareError(
      error,
      "Could not send share notification. Please try again."
    )
  }

  return typeof data === "number" ? data : candidates.length
}

export async function sendShareInvites(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  creativeId: string,
  recipientMemberIds: string[]
): Promise<ShareCreativeSendResponse> {
  const uniqueIds = [...new Set(recipientMemberIds.filter(Boolean))]

  if (uniqueIds.length === 0) {
    throw new ShareCreativeError("Select at least one person to share with", 400)
  }

  const context = await loadProjectContext(
    supabase,
    userId,
    projectId,
    creativeId
  )

  const candidateResponse = await getShareCandidates(
    supabase,
    userId,
    projectId,
    creativeId
  )
  const candidateById = new Map(
    candidateResponse.candidates.map((candidate) => [candidate.id, candidate])
  )

  let granted = 0
  const selectedCandidates: ShareCandidate[] = []

  for (const memberId of uniqueIds) {
    const candidate = candidateById.get(memberId)
    if (!candidate) {
      throw new ShareCreativeError("Invalid share recipient", 400)
    }

    if (context.actorRole === "client" && candidate.kind === "team") {
      throw new ShareCreativeError(
        "Client users can only share with other client users",
        403
      )
    }

    selectedCandidates.push(candidate)

    const didGrant = await grantProjectAccess(supabase, context, candidate)
    if (didGrant) granted += 1
  }

  const notified = await notifyRecipients(
    supabase,
    context,
    selectedCandidates
  )

  if (context.clientId) {
    await touchClientActivity(supabase, context.clientId)
  }

  return { granted, notified }
}
