import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { MasterDriveContent } from "@/components/master-drive/master-drive-content"
import { getUserRole } from "@/lib/get-user-role"

export default async function MasterDrivePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

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

  // Find org
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

  // Fetch all clients for this org
  const { data: allClients } = organization
    ? await supabase
        .from("clients")
        .select("id,name,logo_url")
        .eq("organization_id", organization.id)
        .order("name")
    : { data: [] }

  const clientDirectory =
    allClients?.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url || undefined })) ?? []

  const clientIds = (allClients || []).map((c) => c.id)

  // Fetch all projects for these clients
  const { data: allProjects } = clientIds.length > 0
    ? await supabase
        .from("projects")
        .select("id,name,project_type,client_id,status,created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  const projectIds = (allProjects || []).map((p) => p.id)

  // Fetch all creatives for these projects
  const { data: allCreatives } = projectIds.length > 0
    ? await supabase
        .from("creatives")
        .select("id,name,project_id,type,thumbnail_url,status,iteration,created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  // Build data structures for the component
  const driveClients = (allClients || []).map((c) => ({
    id: c.id,
    name: c.name,
    logoUrl: c.logo_url || undefined,
    projectCount: (allProjects || []).filter((p) => p.client_id === c.id).length,
  }))

  const driveProjects = (allProjects || []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.project_type || "Other",
    clientId: p.client_id,
    creativesCount: (allCreatives || []).filter((c) => c.project_id === p.id).length,
    createdAt: p.created_at,
  }))

  const driveCreatives = (allCreatives || []).map((c) => ({
    id: c.id,
    name: c.name,
    projectId: c.project_id,
    type: c.type || "design",
    thumbnailUrl: c.thumbnail_url || undefined,
    status: c.status || "in_progress",
    iteration: c.iteration || 1,
    createdAt: c.created_at,
  }))

  // Fetch team members for header
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
        <AppSidebar user={userData} userRole={userRole} clientId={clientId} />
        <MasterDriveContent
          user={userData}
          organizationName={organization?.name || ""}
          clients={driveClients}
          projects={driveProjects}
          creatives={driveCreatives}
        />
      </div>
    </div>
  )
}
