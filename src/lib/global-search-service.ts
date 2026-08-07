import type { SupabaseClient } from "@supabase/supabase-js"

import { appRoute } from "@/lib/base-path"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { getUserRole, type UserRole } from "@/lib/get-user-role"
import type {
  GlobalSearchCategory,
  GlobalSearchResult,
} from "@/types/global-search"

const RESULT_LIMIT = 10

function matchesQuery(value: string | null | undefined, query: string): boolean {
  if (!value) return false
  return value.toLowerCase().includes(query.toLowerCase())
}

function roomProjectHref(clientId: string, projectId: string): string {
  return appRoute(`/room?client=${clientId}&project=${projectId}`)
}

interface SearchContext {
  role: UserRole
  organizationId: string
  allowedClientIds: string[]
  allowedProjectIds: Set<string> | null
}

async function resolveSearchContext(
  supabase: SupabaseClient,
  userId: string
): Promise<SearchContext | null> {
  const organization = await getActiveOrganization(supabase, userId)
  if (!organization) return null

  const { role, clientId } = await getUserRole(supabase, userId, organization)

  if (role === "client") {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("id, client_id")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .eq("role", "client")
      .maybeSingle()

    const scopedClientId = clientId || orgMember?.client_id
    if (!scopedClientId) {
      return {
        role,
        organizationId: organization.id,
        allowedClientIds: [],
        allowedProjectIds: new Set(),
      }
    }

    const { data: allProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", scopedClientId)

    const projectIds = (allProjects || []).map((project) => project.id)
    if (projectIds.length === 0 || !orgMember) {
      return {
        role,
        organizationId: organization.id,
        allowedClientIds: [scopedClientId],
        allowedProjectIds: new Set(projectIds),
      }
    }

    const [{ data: accessibleRows }, { data: accessControlledRows }] =
      await Promise.all([
        supabase
          .from("project_client_users")
          .select("project_id")
          .eq("client_user_id", orgMember.id),
        supabase
          .from("project_client_users")
          .select("project_id")
          .in("project_id", projectIds),
      ])

    const accessibleIds = new Set(
      (accessibleRows || []).map((row) => row.project_id)
    )
    const projectsWithAccessControl = new Set(
      (accessControlledRows || []).map((row) => row.project_id)
    )

    const allowedProjectIds = new Set(
      projectIds.filter((projectId) => {
        const hasAccessControl = projectsWithAccessControl.has(projectId)
        return hasAccessControl ? accessibleIds.has(projectId) : true
      })
    )

    return {
      role,
      organizationId: organization.id,
      allowedClientIds: [scopedClientId],
      allowedProjectIds,
    }
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", organization.id)

  return {
    role,
    organizationId: organization.id,
    allowedClientIds: (clients || []).map((client) => client.id),
    allowedProjectIds: null,
  }
}

function projectIsAllowed(
  context: SearchContext,
  projectId: string,
  clientId: string
): boolean {
  if (!context.allowedClientIds.includes(clientId)) return false
  if (context.allowedProjectIds === null) return true
  return context.allowedProjectIds.has(projectId)
}

async function getAllowedProjectRows(
  supabase: SupabaseClient,
  context: SearchContext
): Promise<
  {
    id: string
    name: string
    client_id: string
    references_data: unknown
    project_type: string | null
  }[]
> {
  if (context.allowedClientIds.length === 0) return []

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id, references_data, project_type")
    .in("client_id", context.allowedClientIds)

  return (projects || []).filter(
    (project): project is { id: string; name: string; client_id: string; references_data: unknown; project_type: string | null } =>
      Boolean(project.client_id) &&
      projectIsAllowed(context, project.id, project.client_id!)
  )
}

async function searchClients(
  supabase: SupabaseClient,
  context: SearchContext,
  query: string
): Promise<GlobalSearchResult[]> {
  if (context.allowedClientIds.length === 0) return []

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, industry")
    .eq("organization_id", context.organizationId)
    .in("id", context.allowedClientIds)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(RESULT_LIMIT)

  return (clients || []).map((client) => ({
    id: client.id,
    type: "client",
    category: "clients",
    title: client.name,
    subtitle: client.industry || "Client",
    href: appRoute(`/room?client=${client.id}`),
  }))
}

async function searchProjects(
  supabase: SupabaseClient,
  context: SearchContext,
  query: string
): Promise<GlobalSearchResult[]> {
  const projects = await getAllowedProjectRows(supabase, context)
  const clientIds = [...new Set(projects.map((project) => project.client_id))]

  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, name").in("id", clientIds)
    : { data: [] }

  const clientNameById = new Map(
    (clients || []).map((client) => [client.id, client.name])
  )

  const results: GlobalSearchResult[] = []
  for (const project of projects) {
    const haystack = [project.name, project.project_type || ""]
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(query.toLowerCase())) continue

    results.push({
      id: project.id,
      type: "project",
      category: "projects",
      title: project.name,
      subtitle: [project.project_type, clientNameById.get(project.client_id)]
        .filter(Boolean)
        .join(" · "),
      href: roomProjectHref(project.client_id, project.id),
    })

    if (results.length >= RESULT_LIMIT) break
  }

  return results
}

async function searchTeam(
  supabase: SupabaseClient,
  context: SearchContext,
  query: string
): Promise<GlobalSearchResult[]> {
  if (context.role === "client") return []

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, name, email, role")
    .eq("organization_id", context.organizationId)
    .order("name")
    .limit(100)

  return (members || [])
    .filter((member) =>
      matchesQuery(member.name, query) || matchesQuery(member.email, query)
    )
    .slice(0, RESULT_LIMIT)
    .map((member) => ({
      id: member.id,
      type: "team" as const,
      category: "team" as const,
      title: member.name || member.email || "Team member",
      subtitle: [member.role, member.email].filter(Boolean).join(" · "),
      href: appRoute("/account?tab=team"),
    }))
}

async function searchAssets(
  supabase: SupabaseClient,
  context: SearchContext,
  query: string
): Promise<GlobalSearchResult[]> {
  const projects = await getAllowedProjectRows(supabase, context)
  const projectIds = projects.map((project) => project.id)
  if (projectIds.length === 0) return []

  const projectById = new Map(projects.map((project) => [project.id, project]))
  const results: GlobalSearchResult[] = []

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, name, project_id, type")
    .in("project_id", projectIds)
    .ilike("name", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT)

  for (const creative of creatives || []) {
    const project = projectById.get(creative.project_id)
    if (!project) continue

    results.push({
      id: creative.id,
      type: "creative",
      category: "assets",
      title: creative.name,
      subtitle: `Creative · ${project.name}`,
      href: appRoute(
        `/revue?projectId=${creative.project_id}&creativeId=${creative.id}`
      ),
    })
  }

  if (results.length >= RESULT_LIMIT) return results

  for (const project of projects) {
    const references = Array.isArray(project.references_data)
      ? (project.references_data as Record<string, string>[])
      : []

    for (const [index, reference] of references.entries()) {
      const name = reference.name || reference.file_name || ""
      if (!matchesQuery(name, query)) continue

      results.push({
        id: `${project.id}-ref-${index}`,
        type: "reference",
        category: "assets",
        title: name,
        subtitle: `Reference · ${project.name}`,
        href: roomProjectHref(project.client_id, project.id),
      })

      if (results.length >= RESULT_LIMIT) break
    }

    if (results.length >= RESULT_LIMIT) break
  }

  return results
}

export async function searchGlobal(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  category: GlobalSearchCategory
): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return []

  const context = await resolveSearchContext(supabase, userId)
  if (!context) return []

  switch (category) {
    case "clients":
      return searchClients(supabase, context, trimmed)
    case "projects":
      return searchProjects(supabase, context, trimmed)
    case "team":
      return searchTeam(supabase, context, trimmed)
    case "assets":
      return searchAssets(supabase, context, trimmed)
    default:
      return []
  }
}
