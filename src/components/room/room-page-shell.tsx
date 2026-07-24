"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { RoomContent } from "@/components/room/room-content"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OrgMember {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

interface RoomPageShellProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  userId: string
  organizationId: string | null
  organizationName: string
  organizationLogoUrl: string | null
  currentOrgId?: string
  organizations: { id: string; name: string; logo_url: string | null; role: string }[]
  clientDirectory: { id: string; name: string; logoUrl?: string }[]
  teamMembers: OrgMember[]
  userRole: "admin" | "designer" | "client"
  userClientId?: string | null
  clientData: Parameters<typeof RoomContent>[0]["clientData"]
  clientEditData: Record<string, unknown>
}

export function RoomPageShell({
  user,
  userId,
  organizationId,
  organizationName,
  organizationLogoUrl,
  currentOrgId,
  organizations,
  clientDirectory,
  teamMembers,
  userRole,
  userClientId,
  clientData,
  clientEditData,
}: RoomPageShellProps) {
  const router = useRouter()
  const [isRefreshingProjects, startRefresh] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSuccessToastRef = useRef(false)

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isRefreshingProjects && pendingSuccessToastRef.current) {
      pendingSuccessToastRef.current = false
      showToast("Project created successfully")
    }
  }, [isRefreshingProjects, showToast])

  const handleProjectsRefresh = useCallback(() => {
    pendingSuccessToastRef.current = true
    startRefresh(() => {
      router.refresh()
    })
  }, [router])

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={user}
        userId={userId}
        organizationId={organizationId}
        organizationName={organizationName}
        organizationLogoUrl={organizationLogoUrl}
        currentOrgId={currentOrgId}
        organizations={organizations}
        clientDirectory={clientDirectory}
        teamMembers={teamMembers}
        userRole={userRole}
        onProjectsRefresh={handleProjectsRefresh}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={user} userRole={userRole} clientId={userClientId} />
        <RoomContent
          clientData={clientData}
          orgMembers={teamMembers}
          clientEditData={clientEditData}
          organizationId={organizationId}
          userRole={userRole}
          isRefreshingProjects={isRefreshingProjects}
        />
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2",
            "rounded-full bg-gray-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-gray-900 shadow-xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-300"
          )}
          role="status"
        >
          <Check className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          {toast}
        </div>
      )}
    </div>
  )
}
