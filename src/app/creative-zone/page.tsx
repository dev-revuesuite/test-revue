import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { ZoneContent, type ZoneProject } from "@/components/zone/zone-content"
import { getUserRole } from "@/lib/get-user-role"

export default async function CreativeZonePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

  if (userRole === "client") {
    redirect(clientId ? `/room?client=${clientId}` : "/productive-zone")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", user.id)
    .single()

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  // Find org: owned by user or user is a linked member
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url")
    .eq("created_by", user.id)

  let organization = ownedOrgs?.[0] ?? null

  if (!organization) {
    const { data: memberOrg } = await supabase
      .from("organization_members")
      .select("organizations(id,name,logo_url)")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (memberOrg?.organizations) {
      organization = memberOrg.organizations as unknown as { id: string; name: string; logo_url: string | null }
    }
  }

  const { data: allClients } = organization
    ? await supabase
        .from("clients")
        .select("id,name,logo_url")
        .eq("organization_id", organization.id)
    : { data: [] }

  const clientDirectory =
    allClients?.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url || undefined })) ?? []

  const { data: orgMembersRaw } = organization
    ? await supabase
        .from("organization_members")
        .select("id, name, email, avatar_url, role")
        .eq("organization_id", organization.id)
        .order("name")
    : { data: [] }

  const teamMembers =
    orgMembersRaw?.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      avatar: m.avatar_url || "",
      role: m.role || "",
    })) ?? []

  // Fetch all client IDs for this org
  const clientIds = (allClients || []).map((c) => c.id)
  const clientMap = Object.fromEntries(
    (allClients || []).map((c) => [c.id, c.name])
  )

  // Fetch creative-zone projects
  const { data: projects } = clientIds.length > 0
    ? await supabase
        .from("projects")
        .select(
          "id,name,project_type,client_id,status,brief_status,start_date,end_date,created_at,workmode,references_data,external_links"
        )
        .in("client_id", clientIds)
        .eq("workmode", "creative")
        .order("created_at", { ascending: false })
    : { data: [] }

  // Fetch client logo URLs
  const { data: clientsWithLogos } = clientIds.length > 0
    ? await supabase
        .from("clients")
        .select("id,logo_url")
        .in("id", clientIds)
    : { data: [] }

  const clientLogoMap = Object.fromEntries(
    (clientsWithLogos || []).map((c) => [c.id, c.logo_url])
  )

  // Fetch creatives counts
  const projectIds = (projects || []).map((p) => p.id)
  const { data: creativesData } = projectIds.length > 0
    ? await supabase
        .from("creatives")
        .select("project_id")
        .in("project_id", projectIds)
    : { data: [] }

  const creativesCountMap: Record<string, number> = {}
  for (const c of creativesData || []) {
    creativesCountMap[c.project_id] = (creativesCountMap[c.project_id] || 0) + 1
  }

  // Fetch project members
  const { data: projectMembersData } = projectIds.length > 0
    ? await supabase
        .from("project_members")
        .select("project_id, member_id, role, organization_members(name, avatar_url)")
        .in("project_id", projectIds)
    : { data: [] }

  const projectTeamMap: Record<string, { name: string; avatar?: string }[]> = {}
  for (const pm of projectMembersData || []) {
    if (!projectTeamMap[pm.project_id]) projectTeamMap[pm.project_id] = []
    const member = pm.organization_members as unknown as { name: string; avatar_url: string | null }
    if (member) {
      projectTeamMap[pm.project_id].push({ name: member.name || "", avatar: member.avatar_url || undefined })
    }
  }

  const today = new Date()
  const zoneProjects: ZoneProject[] = (projects || []).map((p) => {
    const endDate = p.end_date ? new Date(p.end_date + "T00:00:00") : null
    const daysLeft = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      id: p.id,
      name: p.name,
      type: p.project_type || "Other",
      clientName: clientMap[p.client_id] || "Unknown",
      clientLogoUrl: clientLogoMap[p.client_id] || undefined,
      clientId: p.client_id,
      status: p.brief_status || p.status || "active",
      startDate: p.start_date,
      endDate: p.end_date,
      daysLeft,
      createdAt: p.created_at,
      team: projectTeamMap[p.id] || [],
      creativesCount: creativesCountMap[p.id] || 0,
      references: ((p.references_data as Record<string, string>[]) || []).map((r) => ({
        name: r.name || "",
        fileUrl: r.file_url || undefined,
      })),
      externalLinks: ((p.external_links as Record<string, string>[]) || []).map((l) => ({
        name: l.name || "",
      })),
    }
  })

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={userData}
        organizationId={organization?.id ?? null}
        organizationLogoUrl={organization?.logo_url ?? null}
        clientDirectory={clientDirectory}
        teamMembers={teamMembers}
        userRole={userRole}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} userRole={userRole} />
        <ZoneContent zone="creative" projects={zoneProjects} />
      </div>
    </div>
  )
}
