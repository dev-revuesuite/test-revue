import type { SupabaseClient } from "@supabase/supabase-js"

import { getActiveOrganization } from "@/lib/get-active-organization"
import { getUserPermissions } from "@/lib/get-user-permissions"
import { hasPermission, PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions"

export class PermissionDeniedError extends Error {
  status: number

  constructor(message = "You do not have permission to perform this action", status = 403) {
    super(message)
    this.name = "PermissionDeniedError"
    this.status = status
  }
}

export async function requireOrgContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ organizationId: string; isOrgOwner: boolean; permissions: ReadonlySet<PermissionKey> }> {
  const organization = await getActiveOrganization(supabase, userId)

  if (!organization) {
    throw new PermissionDeniedError("No active organization", 403)
  }

  const result = await getUserPermissions(supabase, userId, organization.id)
  return {
    organizationId: organization.id,
    isOrgOwner: result.isOrgOwner,
    permissions: result.permissions,
  }
}

export async function requirePermission(
  supabase: SupabaseClient,
  userId: string,
  key: PermissionKey
): Promise<{ organizationId: string; isOrgOwner: boolean; permissions: ReadonlySet<PermissionKey> }> {
  const ctx = await requireOrgContext(supabase, userId)
  if (ctx.isOrgOwner || hasPermission(ctx.permissions, key)) {
    return ctx
  }
  throw new PermissionDeniedError()
}

export async function requireAnyPermission(
  supabase: SupabaseClient,
  userId: string,
  keys: PermissionKey[]
): Promise<{ organizationId: string; isOrgOwner: boolean; permissions: ReadonlySet<PermissionKey> }> {
  const ctx = await requireOrgContext(supabase, userId)
  if (ctx.isOrgOwner || keys.some((key) => hasPermission(ctx.permissions, key))) {
    return ctx
  }
  throw new PermissionDeniedError()
}

export function hasFullInternalPermissions(
  permissions: ReadonlySet<PermissionKey>
): boolean {
  return PERMISSION_KEYS.every((key) => permissions.has(key))
}
