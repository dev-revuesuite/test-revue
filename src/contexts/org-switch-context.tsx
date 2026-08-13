"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import { switchOrganization } from "@/lib/actions/switch-organization"

type OrgSwitchContextValue = {
  isOrgSwitchLoading: boolean
  switchingToOrgId: string | null
  performOrgSwitch: (orgId: string) => Promise<boolean>
}

const OrgSwitchContext = createContext<OrgSwitchContextValue | null>(null)

export function OrgSwitchProvider({
  children,
  currentOrgId,
}: {
  children: React.ReactNode
  currentOrgId?: string | null
}) {
  const router = useRouter()
  const [switchingToOrgId, setSwitchingToOrgId] = useState<string | null>(null)
  const [isRefreshing, startTransition] = useTransition()
  const previousOrgIdRef = useRef(currentOrgId)

  useEffect(() => {
    if (previousOrgIdRef.current !== currentOrgId) {
      setSwitchingToOrgId(null)
      previousOrgIdRef.current = currentOrgId
    }
  }, [currentOrgId])

  const performOrgSwitch = useCallback(
    async (orgId: string) => {
      if (!orgId || orgId === currentOrgId) {
        return true
      }

      setSwitchingToOrgId(orgId)

      const result = await switchOrganization(orgId)
      if (!result.success) {
        setSwitchingToOrgId(null)
        return false
      }

      startTransition(() => {
        router.refresh()
      })

      return true
    },
    [currentOrgId, router]
  )

  const isOrgSwitchLoading = switchingToOrgId !== null || isRefreshing

  const value = useMemo(
    () => ({
      isOrgSwitchLoading,
      switchingToOrgId,
      performOrgSwitch,
    }),
    [isOrgSwitchLoading, switchingToOrgId, performOrgSwitch]
  )

  return (
    <OrgSwitchContext.Provider value={value}>{children}</OrgSwitchContext.Provider>
  )
}

export function useOrgSwitch() {
  const context = useContext(OrgSwitchContext)

  if (!context) {
    return {
      isOrgSwitchLoading: false,
      switchingToOrgId: null,
      performOrgSwitch: async () => false,
    }
  }

  return context
}
