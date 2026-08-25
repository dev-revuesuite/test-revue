import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizeProjectBriefStatus } from "@/lib/creative-pipeline-status"
import type { ZoneProject } from "@/components/zone/zone-content"

type ProjectRow = {
  id: string
  name: string
  project_type: string | null
  client_id: string
  status: string | null
  brief_status: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  workmode: string | null
  references_data: unknown
  external_links: unknown
}

export async function fetchZoneProjects(
  supabase: SupabaseClient,
  clientIds: string[],
  clientMap: Record<string, string>,
  clientLogoMap: Record<string, string | null | undefined>,
  workmode: "creative" | "productive"
): Promise<ZoneProject[]> {
  if (clientIds.length === 0) {
    return []
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id,name,project_type,client_id,status,brief_status,start_date,end_date,created_at,workmode,references_data,external_links"
    )
    .in("client_id", clientIds)
    .eq("workmode", workmode)
    .order("created_at", { ascending: false })

  const projectRows = (projects ?? []) as ProjectRow[]
  const projectIds = projectRows.map((project) => project.id)

  const { data: creativesData } =
    projectIds.length > 0
      ? await supabase
          .from("creatives")
          .select("project_id, status")
          .in("project_id", projectIds)
      : { data: [] }

  const creativesByProject = new Map<string, string[]>()
  for (const creative of creativesData ?? []) {
    const list = creativesByProject.get(creative.project_id) ?? []
    list.push(creative.status ?? "brief_received")
    creativesByProject.set(creative.project_id, list)
  }

  const { data: projectMembersData } =
    projectIds.length > 0
      ? await supabase
          .from("project_members")
          .select(
            "project_id, member_id, role, organization_members(name, avatar_url)"
          )
          .in("project_id", projectIds)
      : { data: [] }

  const projectTeamMap: Record<string, { name: string; avatar?: string }[]> = {}
  for (const pm of projectMembersData ?? []) {
    if (!projectTeamMap[pm.project_id]) projectTeamMap[pm.project_id] = []
    const member = pm.organization_members as unknown as {
      name: string
      avatar_url: string | null
    }
    if (member) {
      projectTeamMap[pm.project_id].push({
        name: member.name || "",
        avatar: member.avatar_url || undefined,
      })
    }
  }

  const today = new Date()

  return projectRows.map((project) => {
    const creativeStatuses = creativesByProject.get(project.id) ?? []
    const endDate = project.end_date
      ? new Date(project.end_date + "T00:00:00")
      : null
    const daysLeft = endDate
      ? Math.max(
          0,
          Math.ceil(
            (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0

    return {
      id: project.id,
      name: project.name,
      type: project.project_type || "Other",
      clientName: clientMap[project.client_id] || "Unknown",
      clientLogoUrl: clientLogoMap[project.client_id] || undefined,
      clientId: project.client_id,
      status: normalizeProjectBriefStatus(
        project.brief_status ?? project.status,
        creativeStatuses
      ),
      startDate: project.start_date,
      endDate: project.end_date,
      daysLeft,
      createdAt: project.created_at,
      team: projectTeamMap[project.id] || [],
      creativesCount: creativeStatuses.length,
      references: (
        (project.references_data as Record<string, string>[]) || []
      ).map((reference) => ({
        name: reference.name || "",
        fileUrl: reference.file_url || undefined,
      })),
      externalLinks: (
        (project.external_links as Record<string, string>[]) || []
      ).map((link) => ({
        name: link.name || "",
      })),
    }
  })
}
