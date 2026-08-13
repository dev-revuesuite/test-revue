import type { SupabaseClient } from "@supabase/supabase-js"

const BATCH_SIZE = 100

export interface ClientTeamMember {
  avatar: string
  name: string
}

export interface ClientTeamSummary {
  team: ClientTeamMember[]
  additionalMembers: number
}

type OrgMemberRow = {
  name: string | null
  avatar_url: string | null
  role?: string | null
}

type ProjectRow = {
  id: string
  client_id: string
  account_manager: string | null
}

type ProjectMemberRow = {
  project_id: string
  member_id: string
  role: string | null
  organization_members: OrgMemberRow | OrgMemberRow[] | null
}

type ProjectClientUserRow = {
  project_id: string
  client_user_id: string
  organization_members: OrgMemberRow | OrgMemberRow[] | null
}

type AggregatedMember = {
  id: string
  name: string
  avatar: string
  isAccountManager: boolean
}

function emptySummary(): ClientTeamSummary {
  return { team: [], additionalMembers: 0 }
}

function normalizeOrgMember(
  row: OrgMemberRow | OrgMemberRow[] | null | undefined
): OrgMemberRow | null {
  if (!row) return null
  return Array.isArray(row) ? row[0] ?? null : row
}

function addMember(
  bucket: Map<string, AggregatedMember>,
  memberId: string,
  name: string,
  avatar: string,
  isAccountManager: boolean
) {
  const trimmedName = name.trim()
  if (!trimmedName) return

  const existing = bucket.get(memberId)
  if (existing) {
    if (isAccountManager) {
      existing.isAccountManager = true
    }
    if (!existing.avatar && avatar) {
      existing.avatar = avatar
    }
    return
  }

  bucket.set(memberId, {
    id: memberId,
    name: trimmedName,
    avatar,
    isAccountManager,
  })
}

function isAccountManagerName(
  memberName: string,
  accountManagerNames: Set<string>
): boolean {
  const normalized = memberName.trim().toLowerCase()
  if (!normalized) return false
  return accountManagerNames.has(normalized)
}

function sortMembers(members: AggregatedMember[]): AggregatedMember[] {
  return [...members].sort((a, b) => {
    if (a.isAccountManager !== b.isAccountManager) {
      return a.isAccountManager ? -1 : 1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}

function toSummary(members: AggregatedMember[]): ClientTeamSummary {
  if (members.length === 0) return emptySummary()

  const sorted = sortMembers(members)
  const visible = sorted.slice(0, 4)

  return {
    team: visible.map((member) => ({
      name: member.name,
      avatar: member.avatar,
    })),
    additionalMembers: Math.max(0, sorted.length - visible.length),
  }
}

async function fetchProjects(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<ProjectRow[]> {
  if (clientIds.length === 0) return []

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(clientIds.length / BATCH_SIZE) }, (_, index) => {
      const batch = clientIds.slice(index * BATCH_SIZE, index * BATCH_SIZE + BATCH_SIZE)
      return supabase
        .from("projects")
        .select("id, client_id, account_manager")
        .in("client_id", batch)
    })
  )

  return batches.flatMap((result) => {
    if (result.error) {
      console.error("Failed to fetch projects for client teams:", result.error)
      return []
    }
    return (result.data ?? []) as ProjectRow[]
  })
}

async function fetchProjectMembers(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<ProjectMemberRow[]> {
  if (projectIds.length === 0) return []

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(projectIds.length / BATCH_SIZE) }, (_, index) => {
      const batch = projectIds.slice(index * BATCH_SIZE, index * BATCH_SIZE + BATCH_SIZE)
      return supabase
        .from("project_members")
        .select(
          "project_id, member_id, role, organization_members(name, avatar_url, role)"
        )
        .in("project_id", batch)
    })
  )

  return batches.flatMap((result) => {
    if (result.error) {
      console.error("Failed to fetch project members for client teams:", result.error)
      return []
    }
    return (result.data ?? []) as ProjectMemberRow[]
  })
}

async function fetchProjectClientUsers(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<ProjectClientUserRow[]> {
  if (projectIds.length === 0) return []

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(projectIds.length / BATCH_SIZE) }, (_, index) => {
      const batch = projectIds.slice(index * BATCH_SIZE, index * BATCH_SIZE + BATCH_SIZE)
      return supabase
        .from("project_client_users")
        .select(
          "project_id, client_user_id, organization_members(name, avatar_url, role)"
        )
        .in("project_id", batch)
    })
  )

  return batches.flatMap((result) => {
    if (result.error) {
      console.error("Failed to fetch project client users for client teams:", result.error)
      return []
    }
    return (result.data ?? []) as ProjectClientUserRow[]
  })
}

export async function getClientTeamsForStudio(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<Map<string, ClientTeamSummary>> {
  const summaries = new Map<string, ClientTeamSummary>(
    clientIds.map((clientId) => [clientId, emptySummary()])
  )

  if (clientIds.length === 0) {
    return summaries
  }

  const projects = await fetchProjects(supabase, clientIds)
  if (projects.length === 0) {
    return summaries
  }

  const projectToClient = new Map<string, string>()
  const accountManagersByClient = new Map<string, Set<string>>()

  for (const project of projects) {
    projectToClient.set(project.id, project.client_id)

    const managerName = project.account_manager?.trim()
    if (!managerName) continue

    const normalized = managerName.toLowerCase()
    const names =
      accountManagersByClient.get(project.client_id) ?? new Set<string>()
    names.add(normalized)
    accountManagersByClient.set(project.client_id, names)
  }

  const projectIds = projects.map((project) => project.id)
  const [projectMembers, projectClientUsers] = await Promise.all([
    fetchProjectMembers(supabase, projectIds),
    fetchProjectClientUsers(supabase, projectIds),
  ])

  const membersByClient = new Map<string, Map<string, AggregatedMember>>()

  const getClientBucket = (clientId: string) => {
    const existing = membersByClient.get(clientId)
    if (existing) return existing

    const created = new Map<string, AggregatedMember>()
    membersByClient.set(clientId, created)
    return created
  }

  for (const row of projectMembers) {
    const clientId = projectToClient.get(row.project_id)
    if (!clientId) continue

    const member = normalizeOrgMember(row.organization_members)
    if (!member?.name?.trim()) continue

    const accountManagerNames =
      accountManagersByClient.get(clientId) ?? new Set<string>()
    const isAccountManager =
      row.role === "manager" ||
      isAccountManagerName(member.name, accountManagerNames)

    addMember(
      getClientBucket(clientId),
      row.member_id,
      member.name,
      member.avatar_url ?? "",
      isAccountManager
    )
  }

  for (const row of projectClientUsers) {
    const clientId = projectToClient.get(row.project_id)
    if (!clientId) continue

    const member = normalizeOrgMember(row.organization_members)
    if (!member?.name?.trim()) continue

    const accountManagerNames =
      accountManagersByClient.get(clientId) ?? new Set<string>()
    const isAccountManager = isAccountManagerName(
      member.name,
      accountManagerNames
    )

    addMember(
      getClientBucket(clientId),
      row.client_user_id,
      member.name,
      member.avatar_url ?? "",
      isAccountManager
    )
  }

  for (const clientId of clientIds) {
    const bucket = membersByClient.get(clientId)
    summaries.set(
      clientId,
      bucket ? toSummary([...bucket.values()]) : emptySummary()
    )
  }

  return summaries
}
