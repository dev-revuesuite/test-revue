import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Organizations where the signed-in user is waiting for a guest reviewer seat
 * (they signed up as a client while the organization's plan was full).
 */
export async function getMyGuestSeatWaitlist(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_my_guest_seat_waitlist")
  if (error) {
    // PGRST202: plans v5 migration not applied yet.
    if (error.code !== "PGRST202") {
      console.error("[guest-seats] Failed to load waiting list", { error: error.message })
    }
    return []
  }
  return ((data ?? []) as { organization_name: string | null }[])
    .map((row) => row.organization_name?.trim())
    .filter((name): name is string => Boolean(name))
}

export function guestSeatWaitlistMessage(organizationNames: string[]): string | null {
  if (organizationNames.length === 0) return null
  const names = organizationNames.join(", ")
  const plural = organizationNames.length > 1
  return `Your access to ${names} is on hold: ${plural ? "they have" : "it has"} reached ${plural ? "their" : "its"} limit for client reviewers. We've let them know, and you'll get access once they free up a seat or upgrade.`
}
