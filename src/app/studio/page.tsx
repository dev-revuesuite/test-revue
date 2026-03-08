import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { StudioContent } from "@/components/studio/studio-content"
import { getUserRole } from "@/lib/get-user-role"

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

  // Determine user role and redirect clients to their room
  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

  if (userRole === "client") {
    if (clientId) {
      redirect(`/room?client=${clientId}`)
    } else {
      redirect("/productive-zone")
    }
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

  // Find org: owned by user first
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url,clients(count)")
    .eq("created_by", user.id)

  let organization: { id: string; name: string; logo_url: string | null; clients?: { count: number }[] } | null =
    ownedOrgs?.reduce((best, current) => {
      const currentCount = current.clients?.[0]?.count ?? 0
      const bestCount = best?.clients?.[0]?.count ?? -1
      return currentCount > bestCount ? current : best
    }, null as (typeof ownedOrgs extends (infer T)[] ? T | null : null)) ?? null

  // If no owned org, check orgs where user is a linked member
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

  if (!organization) {
    const { data: createdOrg } = await supabase
      .from("organizations")
      .insert({ name: `${userData.name} Studio`, created_by: user.id })
      .select("id,name,logo_url")
      .single()

    if (createdOrg) {
      organization = { ...createdOrg, clients: [{ count: 0 }] }
      await supabase.from("organization_members").insert({
        organization_id: createdOrg.id,
        user_id: user.id,
        role: "owner",
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar || null,
      })
    }
  }

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
        <AppSidebar user={userData} userRole={userRole} />
        <StudioContent user={userData} clients={clientsData} userRole={userRole} />
      </div>
    </div>
  )
}
