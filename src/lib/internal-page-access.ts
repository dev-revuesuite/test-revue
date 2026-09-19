import type { SupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { getActiveOrganization } from "@/lib/get-active-organization"
import { getUserPermissions } from "@/lib/get-user-permissions"
import { getUserRole } from "@/lib/get-user-role"
import { hasAnyPermission } from "@/lib/permissions"

/** Redirect clients and internal users with zero permissions away from team pages. */
export async function requireInternalPageAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<{ organizationId: string }> {
  const { role: userRole } = await getUserRole(supabase, userId)

  if (userRole === "client") {
    redirect("/client-portal")
  }

  const organization = await getActiveOrganization(supabase, userId)

  if (!organization) {
    redirect("/account")
  }

  const { permissions, isOrgOwner } = await getUserPermissions(
    supabase,
    userId,
    organization.id
  )

  if (!hasAnyPermission(permissions, isOrgOwner)) {
    redirect("/account")
  }

  return { organizationId: organization.id }
}
