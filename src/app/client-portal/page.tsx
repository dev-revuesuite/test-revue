import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { getUserRole } from "@/lib/get-user-role"
import { getUserOrganizations } from "@/lib/get-active-organization"
import { ClientPortalContent } from "@/components/client-portal/client-portal-content"

export default async function ClientPortalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole, clientId, organizationId } = await getUserRole(supabase, user.id)

  // Only client users should access this page
  if (userRole !== "client") {
    redirect("/studio")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", user.id)
    .single()

  const userData = {
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  // Fetch organization
  const { data: organization } = organizationId
    ? await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("id", organizationId)
        .single()
    : { data: null }

  const allOrganizations = await getUserOrganizations(supabase, user.id)

  // Fetch all clients linked to this user via client_users table
  const { data: clientLinks } = await supabase
    .from("client_users")
    .select("client_id")
    .eq("user_id", user.id)

  const clientIds = clientLinks?.map((cl) => cl.client_id) || []

  // If only one client, redirect directly to room
  if (clientIds.length === 1) {
    redirect(`/room?client=${clientIds[0]}`)
  }

  // Fetch client details with project counts
  const { data: clients } = clientIds.length > 0 && organizationId
    ? await supabase
        .from("clients")
        .select("id, name, logo_url, industry")
        .eq("organization_id", organizationId)
        .in("id", clientIds)
        .order("name")
    : { data: [] }

  // Fetch project counts per client
  const clientsWithCounts = await Promise.all(
    (clients || []).map(async (client) => {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)

      return {
        id: client.id,
        name: client.name,
        logoUrl: client.logo_url || "",
        industry: client.industry || "",
        projectCount: count || 0,
      }
    })
  )

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
        <ClientPortalContent
          clients={clientsWithCounts}
          userName={userData.name}
          organizationName={organization?.name || ""}
        />
      </div>
    </div>
  )
}
