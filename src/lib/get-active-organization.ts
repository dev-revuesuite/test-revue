import { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { cache } from "react"

export interface UserOrganization {
  id: string
  name: string
  logo_url: string | null
  role: string
}

/**
 * Returns ALL organizations a user belongs to (owned + member of).
 *
 * Wrapped in React's `cache()` so multiple call sites in the same request
 * share one DB roundtrip. We cannot use `unstable_cache` because that helper
 * forbids accessing `cookies()` (or anything else dynamic) inside its scope,
 * and Supabase server clients need to read cookies to authenticate.
 */
export const getUserOrganizations = cache(
  async (
    supabase: SupabaseClient,
    userId: string
  ): Promise<UserOrganization[]> => {
    const orgsMap = new Map<string, UserOrganization>()

    const [{ data: ownedOrgs }, { data: memberships }] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("created_by", userId),
      supabase
        .from("organization_members")
        .select("role, organizations(id, name, logo_url)")
        .eq("user_id", userId),
    ])

    for (const org of ownedOrgs || []) {
      orgsMap.set(org.id, {
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        role: "owner",
      })
    }

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
)

/**
 * Resolve active org from a preloaded org list.
 * Priority: cookie → profile column → first owned/membership org.
 */
export async function resolveActiveOrganization(
  supabase: SupabaseClient,
  userId: string,
  allOrgs: UserOrganization[],
  profileActiveOrgId?: string | null
): Promise<UserOrganization | null> {
  if (allOrgs.length === 0) return null

  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get("active_org")?.value

  if (cookieOrgId) {
    const match = allOrgs.find((o) => o.id === cookieOrgId)
    if (match) return match
  }

  // undefined = caller did not supply profile field → fetch; null/string = use as-is
  let activeFromProfile: string | null
  if (profileActiveOrgId === undefined) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", userId)
      .maybeSingle()
    activeFromProfile = profile?.active_organization_id ?? null
  } else {
    activeFromProfile = profileActiveOrgId
  }

  if (activeFromProfile) {
    const match = allOrgs.find((o) => o.id === activeFromProfile)
    if (match) {
      try {
        cookieStore.set("active_org", match.id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        })
      } catch {
        // May fail in server components (read-only cookies)
      }
      return match
    }
  }

  const fallback = allOrgs[0]

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

/**
 * Returns the currently active organization for the user.
 * Priority: cookie → profile column → first owned org → first membership org.
 */
export async function getActiveOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<UserOrganization | null> {
  const allOrgs = await getUserOrganizations(supabase, userId)
  return resolveActiveOrganization(supabase, userId, allOrgs)
}
