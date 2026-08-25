import { OrgSwitchProvider } from "@/contexts/org-switch-context"
import { OrgSwitchAwareMain } from "@/components/org-switch-aware-main"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { ZoneContent } from "@/components/zone/zone-content"
import { getUserRole } from "@/lib/get-user-role"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { fetchZoneProjects } from "@/lib/fetch-zone-projects"

export default async function CreativeZonePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole } = await getUserRole(supabase, user.id)

  if (userRole === "client") {
    redirect("/client-portal")
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

  const organization = await getActiveOrganization(supabase, user.id)
  const allOrganizations = await getUserOrganizations(supabase, user.id)

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

  const clientIds = (allClients || []).map((c) => c.id)
  const clientMap = Object.fromEntries(
    (allClients || []).map((c) => [c.id, c.name])
  )
  const clientLogoMap = Object.fromEntries(
    (allClients || []).map((c) => [c.id, c.logo_url])
  )

  const zoneProjects = await fetchZoneProjects(
    supabase,
    clientIds,
    clientMap,
    clientLogoMap,
    "creative"
  )

  return (
    <OrgSwitchProvider currentOrgId={organization?.id}>
      <div className="flex flex-col h-svh">
        <StudioHeader
          user={userData}
          organizationId={organization?.id ?? null}
          organizationName={organization?.name ?? ""}
          organizationLogoUrl={organization?.logo_url ?? null}
          currentOrgId={organization?.id}
          organizations={allOrganizations}
          clientDirectory={clientDirectory}
          teamMembers={teamMembers}
          userRole={userRole}
        />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar user={userData} userRole={userRole} />
          <OrgSwitchAwareMain>
            <ZoneContent zone="creative" projects={zoneProjects} />
          </OrgSwitchAwareMain>
        </div>
      </div>
    </OrgSwitchProvider>
  )
}
