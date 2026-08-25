import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudioPageShell } from "@/components/studio/studio-page-shell"
import { getUserRole } from "@/lib/get-user-role"
import {
  getUserOrganizations,
  resolveActiveOrganization,
} from "@/lib/get-active-organization"
import { getStudioDashboardStats } from "@/lib/get-studio-dashboard-stats"
import { getClientTeamsForStudio } from "@/lib/get-client-teams"
import { backfillCreativePipelineForOrganization } from "@/lib/backfill-creative-pipeline"

export const dynamic = "force-dynamic"

export default async function StudioPage() {
  const supabase = await createClient()

  // getUser() makes a network call to Supabase Auth to validate the JWT — this
  // is what Supabase recommends (getSession() reads unauthenticated cookie
  // data and emits a security warning).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Profile + user orgs in parallel (orgs are now cached via unstable_cache)
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

  // Pass profile.active_organization_id so resolveActiveOrganization skips
  // its own redundant profiles query.
  const organization = await resolveActiveOrganization(
    supabase,
    user.id,
    allOrganizations,
    profile.active_organization_id
  )

  // Role lookup + org-scoped data fetch in parallel — both only need the
  // resolved organization.
  const [userRoleResult, clientsResult, orgMembersResult] = organization
    ? await Promise.all([
        getUserRole(supabase, user.id, organization),
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
    : [
        { role: "admin" as const, organizationId: null, clientId: null },
        { data: [] },
        { data: [] },
      ]

  const { role: userRole } = userRoleResult
  const clients = clientsResult.data
  const orgMembersRaw = orgMembersResult.data

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

  const clientIds = clients?.map((client) => client.id) ?? []

  if (organization?.id) {
    try {
      await backfillCreativePipelineForOrganization(supabase, organization.id)
    } catch (backfillError) {
      console.error("Pipeline backfill failed:", backfillError)
    }
  }

  const [dashboardStats, clientTeams] = await Promise.all([
    getStudioDashboardStats(supabase, clientIds),
    getClientTeamsForStudio(supabase, clientIds),
  ])

  const clientsData =
    clients?.map((client) => {
      const teamSummary = clientTeams.get(client.id) ?? {
        team: [],
        additionalMembers: 0,
      }

      return {
        id: client.id,
        name: client.name,
        logoUrl: client.logo_url || undefined,
        createdAt: client.created_at,
        interactionDate: client.interaction_date,
        feedbackDate: client.feedback_date,
        activeProjects: client.projects?.[0]?.count ?? 0,
        team: teamSummary.team,
        additionalMembers: teamSummary.additionalMembers,
      }
    }) ?? []

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
