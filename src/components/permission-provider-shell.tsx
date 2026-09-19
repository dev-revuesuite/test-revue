"use client"

import { PermissionProvider } from "@/contexts/permission-context"
import type { PermissionKey } from "@/lib/permissions"

interface PermissionProviderShellProps {
  permissionKeys: PermissionKey[]
  isOrgOwner?: boolean
  customRoleTitle?: string | null
  children: React.ReactNode
}

export function PermissionProviderShell({
  permissionKeys,
  isOrgOwner = false,
  customRoleTitle = null,
  children,
}: PermissionProviderShellProps) {
  return (
    <PermissionProvider
      permissions={new Set(permissionKeys)}
      isOrgOwner={isOrgOwner}
      customRoleTitle={customRoleTitle}
    >
      {children}
    </PermissionProvider>
  )
}
