"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import {
  createOrganizationRole,
  deleteOrganizationRole,
  fetchOrganizationRoles,
  updateOrganizationRole,
  type OrganizationRole,
} from "@/lib/organization-roles-service"
import type { PermissionKey } from "@/lib/permissions"
import { RoleForm, type RoleFormValues } from "@/components/account/role-form"

interface RolesTabProps {
  organizationId: string
  isOrgOwner: boolean
}

export function RolesTab({ organizationId, isOrgOwner }: RolesTabProps) {
  const router = useRouter()
  const [roles, setRoles] = React.useState<OrganizationRole[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<OrganizationRole | null>(
    null
  )
  const [deletingRole, setDeletingRole] = React.useState<OrganizationRole | null>(
    null
  )
  const [reassignRoleId, setReassignRoleId] = React.useState("")
  const [actionError, setActionError] = React.useState<string | null>(null)

  const loadRoles = React.useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const data = await fetchOrganizationRoles(supabase, organizationId)
    setRoles(data)
    setLoading(false)
  }, [organizationId])

  React.useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const handleCreate = async (values: RoleFormValues) => {
    const supabase = createClient()
    const { role, error } = await createOrganizationRole(supabase, {
      organizationId,
      title: values.title,
      description: values.description,
      permissionKeys: values.permissionKeys,
    })
    if (error || !role) throw new Error(error ?? "Failed to create role")
    setShowForm(false)
    await loadRoles()
    router.refresh()
  }

  const handleUpdate = async (values: RoleFormValues) => {
    if (!editingRole) return
    const supabase = createClient()
    const { error } = await updateOrganizationRole(supabase, {
      roleId: editingRole.id,
      title: values.title,
      description: values.description,
      permissionKeys: values.permissionKeys,
    })
    if (error) throw new Error(error)
    setEditingRole(null)
    await loadRoles()
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingRole) return
    setActionError(null)
    const supabase = createClient()
    const needsReassign = (deletingRole.member_count ?? 0) > 0
    if (needsReassign && !reassignRoleId) {
      setActionError("Select a role to reassign members before deleting")
      return
    }

    const { error } = await deleteOrganizationRole(
      supabase,
      deletingRole.id,
      needsReassign ? reassignRoleId : undefined
    )
    if (error) {
      setActionError(error)
      return
    }
    setDeletingRole(null)
    setReassignRoleId("")
    await loadRoles()
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading roles...
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom roles and assign permissions for your team.
          </p>
        </div>
        {isOrgOwner ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add New Role
          </button>
        ) : null}
      </div>

      {roles.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No roles yet. {isOrgOwner ? "Create your first role to get started." : "Ask the organization owner to create roles."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border border-border rounded-xl p-4 bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-foreground">{role.title}</h3>
                  {role.description ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-2">
                    {role.permission_keys.length} permission
                    {role.permission_keys.length !== 1 ? "s" : ""} ·{" "}
                    {role.member_count ?? 0} member
                    {(role.member_count ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                {isOrgOwner ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label={`Edit ${role.title}`}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingRole(role)
                        setReassignRoleId("")
                        setActionError(null)
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label={`Delete ${role.title}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <RoleForm
          submitLabel="Create Role"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {editingRole ? (
        <RoleForm
          initialValues={{
            title: editingRole.title,
            description: editingRole.description,
            permissionKeys: editingRole.permission_keys as PermissionKey[],
          }}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
          onClose={() => setEditingRole(null)}
        />
      ) : null}

      {deletingRole ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete role?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {deletingRole.member_count
                ? `"${deletingRole.title}" is assigned to ${deletingRole.member_count} member(s). Reassign them first.`
                : `Delete "${deletingRole.title}" permanently?`}
            </p>
            {deletingRole.member_count ? (
              <select
                value={reassignRoleId}
                onChange={(e) => setReassignRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mb-4"
              >
                <option value="">Select replacement role</option>
                {roles
                  .filter((r) => r.id !== deletingRole.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
              </select>
            ) : null}
            {actionError ? (
              <p className="text-sm text-destructive mb-4">{actionError}</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
