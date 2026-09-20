"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Shield, Trash2, X } from "lucide-react"

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
  const [isDeleting, setIsDeleting] = React.useState(false)
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
    if (!deletingRole || isDeleting) return
    if ((deletingRole.member_count ?? 0) > 0) return

    setIsDeleting(true)
    setActionError(null)
    try {
      const supabase = createClient()
      const { error } = await deleteOrganizationRole(
        supabase,
        organizationId,
        deletingRole.id
      )

      if (error) {
        setActionError(error)
        return
      }

      setDeletingRole(null)
      await loadRoles()
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  const assignedCount = deletingRole?.member_count ?? 0
  const isAssignedWarning = Boolean(deletingRole && assignedCount > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading roles...
      </div>
    )
  }

  return (
    <div className="w-full">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors"
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
            No roles yet.{" "}
            {isOrgOwner
              ? "Create your first role to get started."
              : "Ask the organization owner to create roles."}
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Edit Role"
                      aria-label={`Edit ${role.title}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingRole(role)
                        setActionError(null)
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete Role"
                      aria-label={`Delete ${role.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
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

      {deletingRole && isAssignedWarning ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Role still assigned
              </h2>
              <button
                onClick={() => setDeletingRole(null)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {assignedCount === 1
                  ? `“${deletingRole.title}” is still assigned to 1 member. Reassign them on the Team tab first.`
                  : `“${deletingRole.title}” is still assigned to ${assignedCount} members. Reassign them on the Team tab first.`}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingRole && !isAssignedWarning ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Delete role</h2>
              <button
                onClick={() => {
                  if (!isDeleting) setDeletingRole(null)
                }}
                disabled={isDeleting}
                className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Delete “{deletingRole.title}” permanently? This cannot be undone.
              </p>
              {actionError ? (
                <p className="text-sm text-destructive mt-3">{actionError}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setDeletingRole(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
