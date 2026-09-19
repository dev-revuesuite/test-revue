import type { SupabaseClient } from "@supabase/supabase-js"
import { cache } from "react"

import {
  ALL_PERMISSIONS,
  type PermissionKey,
  permissionSetFromKeys,
} from "@/lib/permissions"
import { isOrgOwner } from "@/lib/is-org-owner"

export interface UserPermissionsResult {
  permissions: ReadonlySet<PermissionKey>
  isOrgOwner: boolean
  customRoleId: string | null
  customRoleTitle: string | null
}

async function fetchPermissionsForRole(
  supabase: SupabaseClient,
  roleId: string
): Promise<Set<PermissionKey>> {
  const { data, error } = await supabase
    .from("organization_role_permissions")
    .select("permission_key")
    .eq("role_id", roleId)

  if (error || !data) {
    if (error) {
      console.error("Failed to load role permissions:", error.message)
    }
    return new Set()
  }

  return permissionSetFromKeys(data.map((row) => row.permission_key))
}

export const getUserPermissions = cache(
  async (
    supabase: SupabaseClient,
    userId: string,
    organizationId: string | null
  ): Promise<UserPermissionsResult> => {
    if (!organizationId) {
      return {
        permissions: new Set(),
        isOrgOwner: false,
        customRoleId: null,
        customRoleTitle: null,
      }
    }

    const owner = await isOrgOwner(supabase, userId, organizationId)
    if (owner) {
      return {
        permissions: ALL_PERMISSIONS,
        isOrgOwner: true,
        customRoleId: null,
        customRoleTitle: null,
      }
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select(
        "role, custom_role_id, organization_roles:custom_role_id(id, title)"
      )
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!membership || membership.role === "client") {
      return {
        permissions: new Set(),
        isOrgOwner: false,
        customRoleId: null,
        customRoleTitle: null,
      }
    }

    if (!membership.custom_role_id) {
      return {
        permissions: new Set(),
        isOrgOwner: false,
        customRoleId: null,
        customRoleTitle: null,
      }
    }

    const roleJoin = membership.organization_roles as
      | { id: string; title: string }
      | { id: string; title: string }[]
      | null

    const roleRecord = Array.isArray(roleJoin) ? roleJoin[0] : roleJoin
    const permissions = await fetchPermissionsForRole(
      supabase,
      membership.custom_role_id
    )

    return {
      permissions,
      isOrgOwner: false,
      customRoleId: membership.custom_role_id,
      customRoleTitle: roleRecord?.title ?? null,
    }
  }
)
