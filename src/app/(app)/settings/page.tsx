import { OrgSwitchProvider } from "@/contexts/org-switch-context"
import { OrgSwitchAwareMain } from "@/components/org-switch-aware-main"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { AccountContent } from "@/components/account/account-content"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { getUserRole } from "@/lib/get-user-role"
import { ensureOrganizationOwnerMember } from "@/lib/ensure-organization-owner-member"
import { isOrgOwner as checkIsOrgOwner } from "@/lib/is-org-owner"

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
        .select("id,name,logo_url,email,phone,website,industry,size,country,state,created_by")
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

  const isOrgOwner = organization?.created_by
    ? await checkIsOrgOwner(supabase, user.id, organization.id)
    : false

  if (organization?.created_by === user.id) {
    await ensureOrganizationOwnerMember(supabase, {
      organizationId: organization.id,
      ownerUserId: user.id,
      name: userData.name,
      email: user.email || "",
      avatar: userData.avatar,
      phone: profileData.phone,
    })
  }

  const { data: membersRaw } = organization
    ? await supabase
        .from("organization_members")
        .select("id,user_id,name,email,phone,avatar_url,role,custom_role_id,organization_roles:custom_role_id(title)")
        .eq("organization_id", organization.id)
        .neq("role", "client")
        .order("name")
    : { data: [] }

  const teamMembers =
    membersRaw?.map((m) => {
      const roleJoin = m.organization_roles as
        | { title: string }
        | { title: string }[]
        | null
      const roleTitle = Array.isArray(roleJoin)
        ? roleJoin[0]?.title
        : roleJoin?.title

      return {
        id: m.id,
        userId: m.user_id ?? null,
        name: m.name || "",
        email: m.email || "",
        phone: m.phone || "",
        role: m.role || "member",
        avatar: m.avatar_url || "",
        customRoleId: m.custom_role_id ?? null,
        roleTitle: roleTitle || (m.role === "owner" ? "Owner" : "Unassigned"),
      }
    }) ?? []

  if (
    organization?.created_by === user.id &&
    !teamMembers.some((member) => member.userId === user.id)
  ) {
    teamMembers.unshift({
      id: `owner:${user.id}`,
      userId: user.id,
      name: userData.name,
      email: user.email || "",
      phone: profileData.phone,
      role: "owner",
      avatar: userData.avatar,
      customRoleId: null,
      roleTitle: "Owner",
    })
  }

  return (
    <OrgSwitchProvider currentOrgId={organization?.id}>
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
          <OrgSwitchAwareMain>
            <AccountContent
              user={userData}
              defaultTab="settings"
              organization={orgData}
              teamMembers={teamMembers}
              profileData={profileData}
              organizationId={organization?.id ?? null}
              isOrgOwner={isOrgOwner}
              currentUserId={user.id}
            />
          </OrgSwitchAwareMain>
        </div>
      </div>
    </OrgSwitchProvider>
  )
}
