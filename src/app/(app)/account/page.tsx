import { OrgSwitchProvider } from "@/contexts/org-switch-context"
import { OrgSwitchAwareMain } from "@/components/org-switch-aware-main"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { AccountContent } from "@/components/account/account-content"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { getUserRole } from "@/lib/get-user-role"
import { fetchOrganizationRoles } from "@/lib/organization-roles-service"
import { isOrgOwner as checkIsOrgOwner } from "@/lib/is-org-owner"

type TabType = "profile" | "settings" | "team" | "roles" | "organisations"

const validTabs: TabType[] = ["profile", "settings", "team", "roles", "organisations"]

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

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

  const isOrgOwner = organization
    ? await checkIsOrgOwner(supabase, user.id, organization.id)
    : false

  const [orgRoles, membersResult, userRoleResult] = organization
    ? await Promise.all([
        fetchOrganizationRoles(supabase, organization.id),
        supabase
          .from("organization_members")
          .select(
            "id,name,email,phone,avatar_url,role,custom_role_id,organization_roles:custom_role_id(title)"
          )
          .eq("organization_id", organization.id)
          .order("name"),
        getUserRole(supabase, user.id, activeOrg),
      ])
    : [[], { data: [] }, { role: "admin" as const, organizationId: null, clientId: null }]

  const teamMembers =
    membersResult.data?.map((m) => {
      const roleJoin = m.organization_roles as
        | { title: string }
        | { title: string }[]
        | null
      const roleTitle = Array.isArray(roleJoin)
        ? roleJoin[0]?.title
        : roleJoin?.title

      return {
        id: m.id,
        name: m.name || "",
        email: m.email || "",
        phone: m.phone || "",
        role: m.role || "member",
        avatar: m.avatar_url || "",
        customRoleId: m.custom_role_id ?? null,
        roleTitle:
          m.role === "client"
            ? "Client"
            : roleTitle || (m.role === "owner" ? "Owner" : "Unassigned"),
        isClient: m.role === "client",
      }
    }) ?? []

  const tabParam = params.tab as TabType | undefined
  const defaultTab: TabType =
    tabParam && validTabs.includes(tabParam)
      ? tabParam === "roles" && !isOrgOwner
        ? "profile"
        : tabParam
      : "profile"

  const { role: userRole } = userRoleResult

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
            <AppSidebar user={userData} userRole={userRole} />
            <OrgSwitchAwareMain>
              <AccountContent
                user={userData}
                defaultTab={defaultTab}
                organization={orgData}
                teamMembers={teamMembers}
                profileData={profileData}
                organizationId={organization?.id ?? null}
                isOrgOwner={isOrgOwner}
                orgRoles={orgRoles.map((r) => ({
                  id: r.id,
                  title: r.title,
                }))}
              />
            </OrgSwitchAwareMain>
          </div>
        </div>
    </OrgSwitchProvider>
  )
}
