import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { ZoneContent, type ZoneProject } from "@/components/zone/zone-content"

export default async function ProductiveZonePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
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

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url")
    .eq("created_by", user.id)

  const organization = orgs?.[0] ?? null

  const { data: allClients } = organization
    ? await supabase
        .from("clients")
        .select("id,name")
        .eq("organization_id", organization.id)
    : { data: [] }

  const clientDirectory =
    allClients?.map((c) => ({ id: c.id, name: c.name })) ?? []

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

  const clientIds = (allClients || []).map((c) => c.id)
  const clientMap = Object.fromEntries(
    (allClients || []).map((c) => [c.id, c.name])
  )

  // Fetch productive-zone projects
  const { data: projects } = clientIds.length > 0
    ? await supabase
        .from("projects")
        .select(
          "id,name,project_type,client_id,status,brief_status,start_date,end_date,created_at,team_roles,workmode"
        )
        .in("client_id", clientIds)
        .eq("workmode", "productive")
        .order("created_at", { ascending: false })
    : { data: [] }

  const { data: clientsWithLogos } = clientIds.length > 0
    ? await supabase
        .from("clients")
        .select("id,logo_url")
        .in("id", clientIds)
    : { data: [] }

  const clientLogoMap = Object.fromEntries(
    (clientsWithLogos || []).map((c) => [c.id, c.logo_url])
  )

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
      team: ((p.team_roles as Record<string, string>[]) || []).map((t) => ({
        name: t.name || "",
        avatar: undefined,
      })),
      creativesCount: creativesCountMap[p.id] || 0,
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
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} />
        <ZoneContent zone="productive" projects={zoneProjects} />
      </div>
    </div>
  )
}
