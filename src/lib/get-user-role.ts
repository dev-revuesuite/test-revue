import { SupabaseClient } from "@supabase/supabase-js"
import {
  getActiveOrganization,
  type UserOrganization,
} from "./get-active-organization"
import { getUserPermissions } from "./get-user-permissions"
import { hasFullInternalPermissions } from "./require-permission"

export type UserRole = "admin" | "designer" | "client"

export function mapOrgRoleToUserRole(
  org: UserOrganization | null,
  options: {
    isOrgOwner?: boolean
    hasFullAccess?: boolean
  } = {}
): UserRole {
  if (!org) return "designer"
  if (org.role === "client") return "client"
  if (
    options.isOrgOwner ||
    org.role === "admin" ||
    org.role === "owner" ||
    options.hasFullAccess
  ) {
    return "admin"
  }
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
    return { role: "designer", organizationId: null, clientId: null }
  }

  const permissionsResult = await getUserPermissions(supabase, userId, org.id)
  const role = mapOrgRoleToUserRole(org, {
    isOrgOwner: permissionsResult.isOrgOwner,
    hasFullAccess: hasFullInternalPermissions(permissionsResult.permissions),
  })

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
