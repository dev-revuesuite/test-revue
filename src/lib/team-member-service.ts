import type { SupabaseClient } from "@supabase/supabase-js"

export async function assertRoleBelongsToOrg(
  supabase: SupabaseClient,
  organizationId: string,
  customRoleId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("id", customRoleId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  return !error && !!data
}

function escapeIlike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export interface InviteInternalMemberInput {
  organizationId: string
  name: string
  email: string
  customRoleId: string
}

export async function inviteInternalMember(
  supabase: SupabaseClient,
  input: InviteInternalMemberInput
): Promise<{ memberId: string | null; error: string | null }> {
  if (!input.customRoleId) {
    return { memberId: null, error: "A role must be selected" }
  }

  const email = input.email.trim()
  if (!email) {
    return { memberId: null, error: "Email is required" }
  }

  const roleValid = await assertRoleBelongsToOrg(
    supabase,
    input.organizationId,
    input.customRoleId
  )
  if (!roleValid) {
    return { memberId: null, error: "Selected role is not valid for this organization" }
  }

  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", input.organizationId)
    .ilike("email", escapeIlike(email))
    .limit(1)

  if (existing && existing.length > 0) {
    return { memberId: null, error: "A member with this email already exists." }
  }

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: input.organizationId,
      name: input.name.trim(),
      email,
      phone: "",
      role: "member",
      custom_role_id: input.customRoleId,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { memberId: null, error: error?.message ?? "Failed to invite member" }
  }

  return { memberId: data.id, error: null }
}

/**
 * Role changes go through an RPC: it authorizes the caller server-side and avoids
 * RLS policy evaluation on organization_members entirely.
 */
export async function updateMemberCustomRole(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string,
  customRoleId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("update_organization_member_role", {
    p_member_id: memberId,
    p_custom_role_id: customRoleId,
  })

  return { error: error?.message ?? null }
}

export interface UpdateMemberDetailsInput {
  memberId: string
  name: string
  email: string
  phone: string
  customRoleId: string | null
}

export async function updateMemberDetails(
  supabase: SupabaseClient,
  input: UpdateMemberDetailsInput
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("update_organization_member_details", {
    p_member_id: input.memberId,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_custom_role_id: input.customRoleId,
  })

  return { error: error?.message ?? null }
}

export async function removeOrganizationMembers(
  supabase: SupabaseClient,
  memberIds: string[]
): Promise<{ error: string | null }> {
  if (memberIds.length === 0) return { error: null }

  const { error } = await supabase.rpc("delete_organization_members", {
    p_member_ids: memberIds,
  })

  return { error: error?.message ?? null }
}
