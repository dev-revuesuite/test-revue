import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * The signed-in owner's failing subscription (renewal failed, 7-day grace
 * running), or null. Reads with the user's session: RLS only returns the
 * buyer's own rows, so team members and clients always get null. Any error
 * (e.g. before the billing migration) is treated as "no issue".
 */
export async function getFailingPayment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ graceEndsAt: string | null } | null> {
  try {
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("grace_ends_at")
      .eq("created_by", userId)
      .in("status", ["pending", "halted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const graceEndsAt = (data.grace_ends_at as string | null) ?? null
    // Grace over: the workspaces are already view-only and the "plan ended"
    // notices take over, so there's nothing left to warn about.
    if (graceEndsAt && new Date(graceEndsAt).getTime() <= Date.now()) return null
    return { graceEndsAt }
  } catch {
    return null
  }
}
