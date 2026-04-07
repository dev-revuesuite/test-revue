import { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export interface UserOrganization {
  id: string
  name: string
  logo_url: string | null
  role: string
}

/**
 * Returns ALL organizations a user belongs to (owned + member of).
 */
export async function getUserOrganizations(
  supabase: SupabaseClient,
  userId: string
): Promise<UserOrganization[]> {
  const orgsMap = new Map<string, UserOrganization>()

  // 1. Orgs the user created (they are the owner)
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("id, name, logo_url")
    .eq("created_by", userId)

  for (const org of ownedOrgs || []) {
    orgsMap.set(org.id, {
      id: org.id,
      name: org.name,
      logo_url: org.logo_url,
      role: "owner",
    })
  }

  // 2. Orgs the user is a member of (via organization_members)
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, logo_url)")
    .eq("user_id", userId)

  for (const membership of memberships || []) {
    const org = membership.organizations as unknown as {
      id: string
      name: string
      logo_url: string | null
    }
    if (org && !orgsMap.has(org.id)) {
      orgsMap.set(org.id, {
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        role: membership.role || "member",
      })
    }
  }

  return Array.from(orgsMap.values())
}

/**
 * Returns the currently active organization for the user.
 * Priority: cookie → profile column → first owned org → first membership org.
 * Saves the resolved choice back to cookie + profile for persistence.
 */
export async function getActiveOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<UserOrganization | null> {
  const allOrgs = await getUserOrganizations(supabase, userId)

  if (allOrgs.length === 0) return null

  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get("active_org")?.value

  // 1. Try cookie value
  if (cookieOrgId) {
    const match = allOrgs.find((o) => o.id === cookieOrgId)
    if (match) return match
  }

  // 2. Try profile.active_organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .single()

  if (profile?.active_organization_id) {
    const match = allOrgs.find((o) => o.id === profile.active_organization_id)
    if (match) {
      // Profile had a valid org but cookie was missing — set the cookie
      try {
        cookieStore.set("active_org", match.id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
          sameSite: "lax",
        })
      } catch {
        // May fail in server components (read-only cookies)
      }
      return match
    }
  }

  // 3. Fallback — pick the first org (owned orgs come first in the map)
  const fallback = allOrgs[0]

  // Save fallback choice for next time
  try {
    cookieStore.set("active_org", fallback.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
  } catch {
    // May fail in server components
  }

  await supabase
    .from("profiles")
    .update({ active_organization_id: fallback.id })
    .eq("id", userId)

  return fallback
}
