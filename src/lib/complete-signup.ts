import type { SupabaseClient, User } from "@supabase/supabase-js"

import { linkPendingInvites } from "@/lib/link-pending-invites"

/**
 * Finishes a new account once it has a session: right after sign-up when email
 * confirmation is off, or after the 6-digit code is verified when it is on.
 * Safe to run more than once.
 */
export async function completeSignup(
  supabase: SupabaseClient,
  {
    user,
    fullName,
    inviteToken,
  }: {
    user: User
    fullName?: string | null
    inviteToken?: string | null
  }
): Promise<void> {
  // The auth trigger usually creates the profile already; this only fills in a
  // missing one and never overwrites an existing profile.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName || user.user_metadata?.full_name || null,
      onboarded: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  )

  // The invite link they came from (joins that workspace and makes it active),
  // then any other invites for this verified email.
  await acceptInviteToken(supabase, inviteToken)
  await linkPendingInvites(supabase, user)
}

/**
 * Accepts an invite link for the signed-in user. Returns the database result
 * ("joined", "expired", ...) or null when there was nothing to accept. Never throws.
 */
export async function acceptInviteToken(
  supabase: SupabaseClient,
  inviteToken?: string | null
): Promise<string | null> {
  if (!inviteToken || !UUID_PATTERN.test(inviteToken)) return null
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: inviteToken })
  if (error) {
    console.error("[invites] accept_invitation failed:", error.message)
    return null
  }
  return typeof data === "string" ? data : null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
