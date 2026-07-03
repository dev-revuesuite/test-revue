import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { AccountContent } from "@/components/account/account-content"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { getUserRole } from "@/lib/get-user-role"

export default async function SettingsPage() {
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
    .select("full_name,avatar_url,phone,job_title,preferences")
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

  const profileData = {
    phone: profile?.phone || "",
    jobTitle: profile?.job_title || "",
    preferences: (profile?.preferences as Record<string, unknown>) || {},
  }

  const activeOrg = await getActiveOrganization(supabase, user.id)
  const allOrganizations = await getUserOrganizations(supabase, user.id)

  const orgId = activeOrg?.id ?? null

  const { data: organization } = orgId
    ? await supabase
        .from("organizations")
        .select("id,name,logo_url,email,phone,website,industry,size,country,state")
        .eq("id", orgId)
        .single()
    : { data: null }

  const orgData = organization
    ? {
        id: organization.id,
        name: organization.name || "",
        logo: organization.logo_url || "",
        email: organization.email || "",
        phone: organization.phone || "",
        website: organization.website || "",
        industry: organization.industry || "Design & Creative",
        size: organization.size || "1-10",
        country: organization.country || "India",
        state: organization.state || "",
      }
    : null

  const { data: membersRaw } = organization
    ? await supabase
        .from("organization_members")
        .select("id,name,email,phone,avatar_url,role")
        .eq("organization_id", organization.id)
        .order("name")
    : { data: [] }

  const teamMembers =
    membersRaw?.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      role: m.role || "Member",
      avatar: m.avatar_url || "",
    })) ?? []

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={userData}
        organizationId={organization?.id ?? null}
        organizationName={organization?.name ?? ""}
        organizationLogoUrl={organization?.logo_url ?? null}
        currentOrgId={organization?.id ?? undefined}
        organizations={allOrganizations}
        clientDirectory={[]}
        userRole={userRole}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} userRole={userRole} clientId={clientId} />
        <AccountContent
          user={userData}
          defaultTab="settings"
          organization={orgData}
          teamMembers={teamMembers}
          profileData={profileData}
          organizationId={organization?.id ?? null}
        />
      </div>
    </div>
  )
}
