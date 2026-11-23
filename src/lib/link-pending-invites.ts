import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Links the signed-in user to the teams and clients that invited their email.
 *
 * The database functions ignore their arguments: they act only for the
 * signed-in user, and only with a verified email (migration
 * 20261123120000_secure_invite_linking.sql). The arguments are still sent
 * because the functions' signatures require them.
 *
 * Never throws: linking must never block signup or login.
 */
export async function linkPendingInvites(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<void> {
  if (!user.email) return

  const args = { p_user_id: user.id, p_email: user.email }
  try {
    const [memberResult, clientResult] = await Promise.all([
      supabase.rpc("link_user_to_org_member", args),
      supabase.rpc("link_user_to_client", args),
    ])
    if (memberResult.error) {
      console.error("[invites] link_user_to_org_member failed:", memberResult.error.message)
    }
    if (clientResult.error) {
      console.error("[invites] link_user_to_client failed:", clientResult.error.message)
    }
  } catch (error) {
    console.error("[invites] linking failed:", error)
  }
}
