"use client"

import * as React from "react"
import { Loader2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissions"

export interface RoleFormValues {
  title: string
  description: string
  permissionKeys: PermissionKey[]
}

interface RoleFormProps {
  initialValues?: RoleFormValues
  submitLabel: string
  onSubmit: (values: RoleFormValues) => Promise<void>
  onClose: () => void
}

export function RoleForm({
  initialValues,
  submitLabel,
  onSubmit,
  onClose,
}: RoleFormProps) {
  const [title, setTitle] = React.useState(initialValues?.title ?? "")
  const [description, setDescription] = React.useState(
    initialValues?.description ?? ""
  )
  const [permissionKeys, setPermissionKeys] = React.useState<Set<PermissionKey>>(
    () => new Set(initialValues?.permissionKeys ?? [])
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const togglePermission = (key: PermissionKey) => {
    setPermissionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Role title is required")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        permissionKeys: Array.from(permissionKeys),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {initialValues ? "Edit Role" : "Add New Role"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Account Admin (Co-owner)"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this role can do"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Permission</h3>
            <div className="space-y-3">
              {PERMISSIONS.map((permission) => {
                const checked = permissionKeys.has(permission.key)
                return (
                  <label
                    key={permission.key}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(permission.key)}
                      className="mt-0.5 h-4 w-4 rounded border-border"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {permission.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {permission.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
