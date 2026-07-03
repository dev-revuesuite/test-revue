import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudioPageShell } from "@/components/studio/studio-page-shell"
import { getUserRole } from "@/lib/get-user-role"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { getStudioDashboardStats } from "@/lib/get-studio-dashboard-stats"

export default async function StudioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url,preferences,onboarded")
    .eq("id", user.id)
    .single()

  if (!profile || profile.onboarded === false) {
    redirect("/onboarding")
  }

  // Determine user role and redirect clients to their portal
  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

  if (userRole === "client") {
    redirect("/client-portal")
  }

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  // Get active organization and all user orgs for the switcher
  const organization = await getActiveOrganization(supabase, user.id)
  const allOrganizations = await getUserOrganizations(supabase, user.id)

  const { data: clients } = organization
    ? await supabase
      .from("clients")
      .select("id,name,logo_url,created_at,interaction_date,feedback_date,projects(count)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
    : { data: [] }

  const clientsData =
    clients?.map((client) => ({
      id: client.id,
      name: client.name,
      logoUrl: client.logo_url || undefined,
      createdAt: client.created_at,
      interactionDate: client.interaction_date,
      feedbackDate: client.feedback_date,
      activeProjects: client.projects?.[0]?.count ?? 0,
      team: [],
      additionalMembers: 0,
    })) ?? []

  const clientDirectory =
    clients?.map((client) => ({
      id: client.id,
      name: client.name,
      logoUrl: client.logo_url || undefined,
    })) ?? []

  // Fetch organization members for manager/team dropdowns in brief dialog
  const { data: orgMembersRaw } = organization
    ? await supabase
      .from("organization_members")
      .select("id, name, email, avatar_url, role")
      .eq("organization_id", organization.id)
      .not("name", "is", null)
      .not("email", "is", null)
      .order("name")
    : { data: [] }

  const teamMembers =
    orgMembersRaw
      ?.filter((m) => m.name && m.name.trim() !== "" && m.email && m.email.trim() !== "")
      ?.map((m) => ({
        id: m.id,
        name: m.name || "",
        email: m.email || "",
        avatar: m.avatar_url || "",
        role: m.role || "",
      })) ?? []

  const clientIds = clientsData.map((client) => client.id)
  const dashboardStats = await getStudioDashboardStats(supabase, clientIds)

  return (
    <StudioPageShell
      user={userData}
      organizationId={organization?.id ?? null}
      organizationName={organization?.name ?? ""}
      organizationLogoUrl={organization?.logo_url ?? null}
      currentOrgId={organization?.id}
      organizations={allOrganizations}
      clientDirectory={clientDirectory}
      teamMembers={teamMembers}
      userRole={userRole}
      clients={clientsData}
      dashboardStats={dashboardStats}
    />
  )
}
