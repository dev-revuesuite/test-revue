"use client"

import * as React from "react"

import {
  ALL_PERMISSIONS,
  hasPermission,
  type PermissionKey,
} from "@/lib/permissions"

interface PermissionContextValue {
  permissions: ReadonlySet<PermissionKey>
  isOrgOwner: boolean
  customRoleTitle: string | null
}

const PermissionContext = React.createContext<PermissionContextValue>({
  permissions: new Set(),
  isOrgOwner: false,
  customRoleTitle: null,
})

export function PermissionProvider({
  permissions,
  isOrgOwner = false,
  customRoleTitle = null,
  children,
}: {
  permissions: ReadonlySet<PermissionKey>
  isOrgOwner?: boolean
  customRoleTitle?: string | null
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({
      permissions: isOrgOwner ? ALL_PERMISSIONS : permissions,
      isOrgOwner,
      customRoleTitle,
    }),
    [permissions, isOrgOwner, customRoleTitle]
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return React.useContext(PermissionContext)
}

export function usePermission(key: PermissionKey): boolean {
  const { permissions, isOrgOwner } = usePermissions()
  return isOrgOwner || hasPermission(permissions, key)
}
