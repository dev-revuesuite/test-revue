"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/**
 * Server action: switches the user's active organization.
 * Called from the OrgSwitcher dropdown when user clicks a different org.
 */
export async function switchOrganization(orgId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Security check: verify user belongs to this org
  // Check if user owns it
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("created_by", user.id)
    .single()

  let isMember = !!ownedOrg

  // If not owner, check organization_members
  if (!isMember) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single()

    isMember = !!membership
  }

  if (!isMember) {
    return { success: false, error: "You are not a member of this organization" }
  }

  // Save to profile
  await supabase
    .from("profiles")
    .update({ active_organization_id: orgId })
    .eq("id", user.id)

  // Save to cookie
  const cookieStore = await cookies()
  cookieStore.set("active_org", orgId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  })

  // Invalidate all cached pages so navigation loads fresh data for the new org
  revalidatePath("/", "layout")

  return { success: true }
}
