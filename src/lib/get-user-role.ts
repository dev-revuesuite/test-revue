import { SupabaseClient } from "@supabase/supabase-js"
import {
  getActiveOrganization,
  type UserOrganization,
} from "./get-active-organization"

export type UserRole = "admin" | "designer" | "client"

export function mapOrgRoleToUserRole(
  org: UserOrganization | null
): UserRole {
  if (!org) return "admin"
  if (org.role === "admin" || org.role === "owner") return "admin"
  if (org.role === "client") return "client"
  return "designer"
}

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
  activeOrg?: UserOrganization | null
): Promise<{ role: UserRole; organizationId: string | null; clientId: string | null }> {
  const org =
    activeOrg !== undefined
      ? activeOrg
      : await getActiveOrganization(supabase, userId)

  if (!org) {
    return { role: "admin", organizationId: null, clientId: null }
  }

  const role = mapOrgRoleToUserRole(org)

  // Owners/admins never need client_id; designers usually don't either.
  if (role !== "client") {
    return { role, organizationId: org.id, clientId: null }
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("client_id")
    .eq("organization_id", org.id)
    .eq("user_id", userId)
    .maybeSingle()

  return {
    role,
    organizationId: org.id,
    clientId: membership?.client_id || null,
  }
}
