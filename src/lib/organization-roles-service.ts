import type { SupabaseClient } from "@supabase/supabase-js"

import type { PermissionKey } from "@/lib/permissions"

export interface OrganizationRole {
  id: string
  organization_id: string
  title: string
  description: string
  permission_keys: PermissionKey[]
  member_count?: number
}

export async function fetchOrganizationRoles(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationRole[]> {
  const { data: roles, error } = await supabase
    .from("organization_roles")
    .select("id, organization_id, title, description")
    .eq("organization_id", organizationId)
    .order("title")

  if (error || !roles) {
    return []
  }

  const roleIds = roles.map((r) => r.id)
  if (roleIds.length === 0) return []

  const [{ data: perms }, { data: members }] = await Promise.all([
    supabase
      .from("organization_role_permissions")
      .select("role_id, permission_key")
      .in("role_id", roleIds),
    supabase
      .from("organization_members")
      .select("custom_role_id")
      .eq("organization_id", organizationId)
      .in("custom_role_id", roleIds),
  ])

  const permsByRole = new Map<string, PermissionKey[]>()
  for (const row of perms ?? []) {
    const list = permsByRole.get(row.role_id) ?? []
    list.push(row.permission_key as PermissionKey)
    permsByRole.set(row.role_id, list)
  }

  const countByRole = new Map<string, number>()
  for (const row of members ?? []) {
    if (!row.custom_role_id) continue
    countByRole.set(
      row.custom_role_id,
      (countByRole.get(row.custom_role_id) ?? 0) + 1
    )
  }

  return roles.map((role) => ({
    ...role,
    permission_keys: permsByRole.get(role.id) ?? [],
    member_count: countByRole.get(role.id) ?? 0,
  }))
}

export async function createOrganizationRole(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    title: string
    description: string
    permissionKeys: PermissionKey[]
  }
): Promise<{ role: OrganizationRole | null; error: string | null }> {
  const { data: role, error } = await supabase
    .from("organization_roles")
    .insert({
      organization_id: input.organizationId,
      title: input.title.trim(),
      description: input.description.trim(),
    })
    .select("id, organization_id, title, description")
    .single()

  if (error || !role) {
    return { role: null, error: error?.message ?? "Failed to create role" }
  }

  if (input.permissionKeys.length > 0) {
    const { error: permError } = await supabase
      .from("organization_role_permissions")
      .insert(
        input.permissionKeys.map((key) => ({
          role_id: role.id,
          permission_key: key,
        }))
      )

    if (permError) {
      await supabase.from("organization_roles").delete().eq("id", role.id)
      return { role: null, error: permError.message }
    }
  }

  return {
    role: {
      ...role,
      permission_keys: input.permissionKeys,
      member_count: 0,
    },
    error: null,
  }
}

export async function updateOrganizationRole(
  supabase: SupabaseClient,
  input: {
    roleId: string
    title: string
    description: string
    permissionKeys: PermissionKey[]
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("organization_roles")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roleId)

  if (error) return { error: error.message }

  await supabase
    .from("organization_role_permissions")
    .delete()
    .eq("role_id", input.roleId)

  if (input.permissionKeys.length > 0) {
    const { error: permError } = await supabase
      .from("organization_role_permissions")
      .insert(
        input.permissionKeys.map((key) => ({
          role_id: input.roleId,
          permission_key: key,
        }))
      )

    if (permError) return { error: permError.message }
  }

  return { error: null }
}

export async function deleteOrganizationRole(
  supabase: SupabaseClient,
  roleId: string,
  reassignToRoleId?: string
): Promise<{ error: string | null }> {
  if (reassignToRoleId) {
    const { error: reassignError } = await supabase
      .from("organization_members")
      .update({ custom_role_id: reassignToRoleId })
      .eq("custom_role_id", roleId)

    if (reassignError) return { error: reassignError.message }
  }

  const { error } = await supabase
    .from("organization_roles")
    .delete()
    .eq("id", roleId)

  return { error: error?.message ?? null }
}

export async function seedDefaultFullAccessRole(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("title", "Full Access")
    .maybeSingle()

  if (existing?.id) return existing.id

  const { role, error } = await createOrganizationRole(supabase, {
    organizationId,
    title: "Full Access",
    description: "Full access to all organization features.",
    permissionKeys: [
      "feedback_ucc",
      "quality_check_tool",
      "add_client",
      "add_brief",
      "add_team_member",
    ],
  })

  if (error || !role) {
    console.error("Failed to seed Full Access role:", error)
    return null
  }

  return role.id
}
