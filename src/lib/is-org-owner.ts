import type { SupabaseClient } from "@supabase/supabase-js"

export async function isOrgOwner(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("created_by", userId)
    .maybeSingle()

  return Boolean(data)
}
