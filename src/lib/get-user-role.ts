import { SupabaseClient } from "@supabase/supabase-js"
import { getActiveOrganization } from "./get-active-organization"

export type UserRole = "admin" | "designer" | "client"

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<{ role: UserRole; organizationId: string | null; clientId: string | null }> {
  // 1. Get the globally resolved active organization
  const activeOrg = await getActiveOrganization(supabase, userId)

  if (!activeOrg) {
    // Default: new user, will become admin after org creation
    return { role: "admin", organizationId: null, clientId: null }
  }

  // 2. Check if user owns this specific organization
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", activeOrg.id)
    .eq("created_by", userId)
    .single()

  if (ownedOrg) {
    return { role: "admin", organizationId: activeOrg.id, clientId: null }
  }

  // 3. Check their specific membership role in this active organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organization_id, client_id")
    .eq("organization_id", activeOrg.id)
    .eq("user_id", userId)
    .single()

  if (membership) {
    const role: UserRole =
      membership.role === "admin" || membership.role === "owner"
        ? "admin"
        : membership.role === "client"
        ? "client"
        : "designer"
    return { role, organizationId: membership.organization_id, clientId: membership.client_id || null }
  }

  // Fallback
  return { role: "admin", organizationId: activeOrg.id, clientId: null }
}
