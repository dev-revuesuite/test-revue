export const PERMISSION_KEYS = [
  "feedback_ucc",
  "quality_check_tool",
  "add_client",
  "add_brief",
  "add_team_member",
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export interface PermissionDefinition {
  key: PermissionKey
  label: string
  description: string
}

/** Single source of truth — must match supabase permissions seed. */
export const PERMISSIONS: PermissionDefinition[] = [
  {
    key: "feedback_ucc",
    label: "Feedback on UCC Page",
    description: "To check errors in design.",
  },
  {
    key: "quality_check_tool",
    label: "Quality Check Tool",
    description: "To check errors in design.",
  },
  {
    key: "add_client",
    label: "Add Client",
    description: "Add clients to the organization.",
  },
  {
    key: "add_brief",
    label: "Add Brief",
    description: "Add new brief to any project.",
  },
  {
    key: "add_team_member",
    label: "Add Team member",
    description: "Add new team member in team.",
  },
]

export const ALL_PERMISSIONS: ReadonlySet<PermissionKey> = new Set(PERMISSION_KEYS)

export function hasPermission(
  permissions: ReadonlySet<PermissionKey>,
  key: PermissionKey
): boolean {
  return permissions.has(key)
}

export function permissionSetFromKeys(keys: string[]): Set<PermissionKey> {
  const allowed = new Set<string>(PERMISSION_KEYS)
  return new Set(keys.filter((k): k is PermissionKey => allowed.has(k)))
}

export function hasAnyPermission(
  permissions: ReadonlySet<PermissionKey>,
  isOrgOwner = false
): boolean {
  return isOrgOwner || permissions.size > 0
}
