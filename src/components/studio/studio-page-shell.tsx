"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { StudioContent } from "@/components/studio/studio-content"
import { AiHealthNotice } from "@/components/studio/ai-health-toast"
import type { StudioDashboardStats } from "@/lib/get-studio-dashboard-stats"
import { getCurrentNavigationPath } from "@/components/navigation-path-tracker"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OrgMember {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

interface StudioClient {
  id: string
  name: string
  logoUrl?: string
  createdAt?: string | null
  interactionDate?: string | null
  feedbackDate?: string | null
  activeProjects: number
  team: { avatar: string; name: string }[]
  additionalMembers: number
}

interface StudioPageShellProps {
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
  clients: StudioClient[]
  dashboardStats: StudioDashboardStats
}

export function StudioPageShell({
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
  clients,
  dashboardStats,
}: StudioPageShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshingPage, startRefresh] = useTransition()
  const [refreshOverlayMessage, setRefreshOverlayMessage] = useState("Updating clients...")
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingToastMessageRef = useRef<string | null>(null)

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
    if (!isRefreshingPage && pendingToastMessageRef.current) {
      showToast(pendingToastMessageRef.current)
      pendingToastMessageRef.current = null
    }
  }, [isRefreshingPage, showToast])

  // Refetch server data when navigating back to Studio (sidebar, back button, etc.)
  useLayoutEffect(() => {
    const fromPath = getCurrentNavigationPath()

    if (pathname === "/studio" && fromPath !== null && fromPath !== "/studio") {
      router.refresh()
    }
  }, [pathname, router])

  const handlePageRefresh = useCallback(
    (successMessage: string, overlayMessage: string) => {
      setRefreshOverlayMessage(overlayMessage)
      pendingToastMessageRef.current = successMessage
      startRefresh(() => {
        router.refresh()
      })
    },
    [router]
  )

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
        onClientsRefresh={() =>
          handlePageRefresh("Client added successfully", "Updating clients...")
        }
        onProjectsRefresh={() =>
          handlePageRefresh("Project created successfully", "Updating studio...")
        }
      />
      <AiHealthNotice />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={user} userRole={userRole} />
        <StudioContent
          user={user}
          clients={clients}
          dashboardStats={dashboardStats}
          userRole={userRole}
          isRefreshingClients={isRefreshingPage}
          refreshOverlayMessage={refreshOverlayMessage}
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
