import { SupabaseClient } from "@supabase/supabase-js"

export type UserRole = "admin" | "designer" | "client"

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<{ role: UserRole; organizationId: string | null; clientId: string | null }> {
  // Check if user owns an organization
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single()

  if (ownedOrg) {
    return { role: "admin", organizationId: ownedOrg.id, clientId: null }
  }

  // Check if user is a linked member
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organization_id, client_id")
    .eq("user_id", userId)
    .limit(1)
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

  // Default: new user, will become admin after org creation
  return { role: "admin", organizationId: null, clientId: null }
}
