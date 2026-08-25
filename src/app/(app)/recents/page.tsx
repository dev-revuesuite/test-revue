import { OrgSwitchProvider } from "@/contexts/org-switch-context"
import { OrgSwitchAwareMain } from "@/components/org-switch-aware-main"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { getUserRole } from "@/lib/get-user-role"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { Clock } from "lucide-react"

export default async function RecentsPage() {
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
          userRole={userRole}
        />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar user={userData} userRole={userRole} clientId={clientId} />
          <OrgSwitchAwareMain>
            <main className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-semibold mb-2">Recents</h1>
                <p className="text-muted-foreground">Your recently accessed items will appear here</p>
              </div>
            </main>
          </OrgSwitchAwareMain>
        </div>
      </div>
    </OrgSwitchProvider>
  )
}
