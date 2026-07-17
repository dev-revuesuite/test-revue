import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudioPageShell } from "@/components/studio/studio-page-shell"
import { getUserRole } from "@/lib/get-user-role"
import {
  getUserOrganizations,
  resolveActiveOrganization,
} from "@/lib/get-active-organization"
import { getStudioDashboardStats } from "@/lib/get-studio-dashboard-stats"

export const dynamic = "force-dynamic"

export default async function StudioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, allOrganizations] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url,preferences,onboarded,active_organization_id")
      .eq("id", user.id)
      .maybeSingle(),
    getUserOrganizations(supabase, user.id),
  ])

  if (!profile || profile.onboarded === false) {
    redirect("/onboarding")
  }

  const organization = await resolveActiveOrganization(
    supabase,
    user.id,
    allOrganizations,
    profile.active_organization_id
  )

  const { role: userRole } = await getUserRole(supabase, user.id, organization)

  if (userRole === "client") {
    redirect("/client-portal")
  }

  const userData = {
    name:
      profile.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile.avatar_url || user.user_metadata?.avatar_url || "",
  }

  const [clientsResult, orgMembersResult] = organization
    ? await Promise.all([
        supabase
          .from("clients")
          .select(
            "id,name,logo_url,created_at,interaction_date,feedback_date,projects(count)"
          )
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("organization_members")
          .select("id, name, email, avatar_url, role")
          .eq("organization_id", organization.id)
          .not("name", "is", null)
          .not("email", "is", null)
          .order("name"),
      ])
    : [{ data: [] }, { data: [] }]

  const clients = clientsResult.data
  const orgMembersRaw = orgMembersResult.data

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

  const teamMembers =
    orgMembersRaw
      ?.filter(
        (m) =>
          m.name &&
          m.name.trim() !== "" &&
          m.email &&
          m.email.trim() !== ""
      )
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
      userId={user.id}
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
