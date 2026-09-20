import type { SupabaseClient } from "@supabase/supabase-js"

function escapeIlike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function throwIfError(
  context: string,
  error: { message?: string } | null
): void {
  if (!error) return
  console.error(context, error)
  throw new Error(error.message || context)
}

export async function ensureOrganizationOwnerMember(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    ownerUserId: string
    name: string
    email: string
    avatar?: string
    phone?: string
  }
): Promise<void> {
  const { data: byUser, error: byUserError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.ownerUserId)
    .limit(1)

  throwIfError("Failed to look up organization owner member:", byUserError)

  if (byUser && byUser.length > 0) return

  const email = input.email.trim()
  if (email) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", input.organizationId)
      .ilike("email", escapeIlike(email))
      .limit(1)

    throwIfError("Failed to look up organization owner member by email:", byEmailError)

    const existingId = byEmail?.[0]?.id
    if (existingId) {
      const { error: updateError } = await supabase
        .from("organization_members")
        .update({
          user_id: input.ownerUserId,
          role: "owner",
          name: input.name,
          avatar_url: input.avatar || "",
        })
        .eq("id", existingId)

      throwIfError("Failed to link organization owner member:", updateError)
      return
    }
  }

  const { error: insertError } = await supabase.from("organization_members").insert({
    organization_id: input.organizationId,
    user_id: input.ownerUserId,
    role: "owner",
    name: input.name,
    email,
    phone: input.phone || "",
    avatar_url: input.avatar || "",
  })

  throwIfError("Failed to insert organization owner member:", insertError)
}
