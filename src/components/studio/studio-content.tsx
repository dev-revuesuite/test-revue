"use client"

import { publicPath } from "@/lib/base-path"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Users, FolderOpen, MessageSquare, AlertCircle, RefreshCw, ArrowRight, Plus, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOrgSwitch } from "@/contexts/org-switch-context"
import { OrgSwitchMainSkeleton } from "@/components/studio/studio-loading-skeletons"
import { ClientCard } from "./client-card"
import type { StudioDashboardStats } from "@/lib/get-studio-dashboard-stats"

interface StudioContentProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  clients: StudioClient[]
  dashboardStats: StudioDashboardStats
  onAddClient?: () => void
  userRole?: "admin" | "designer" | "client"
  isRefreshingClients?: boolean
  refreshOverlayMessage?: string
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

const getStats = (clientsData: StudioClient[], dashboardStats: StudioDashboardStats) => {
  const totalClients = clientsData.length
  const activeProjects = clientsData.reduce((sum, c) => sum + c.activeProjects, 0)

  return [
    {
      label: "Total Clients",
      value: String(totalClients),
      icon: Users,
    },
    {
      label: "Active Projects",
      value: String(activeProjects),
      icon: FolderOpen,
    },
    {
      label: "Feedback",
      value: String(dashboardStats.feedback),
      icon: MessageSquare,
    },
    {
      label: "QC Pending",
      value: String(dashboardStats.qcPending),
      icon: AlertCircle,
    },
    {
      label: "Iterations",
      value: String(dashboardStats.iterations),
      icon: RefreshCw,
    },
  ]
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  try {
    return format(new Date(value), "d MMM")
  } catch {
    return "—"
  }
}

export function StudioContent({
  user,
  clients,
  dashboardStats,
  onAddClient,
  userRole = "admin",
  isRefreshingClients = false,
  refreshOverlayMessage = "Updating clients...",
}: StudioContentProps) {
  const { isOrgSwitchLoading } = useOrgSwitch()
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const showWelcome =
    clients.length === 0 && userRole === "admin" && !welcomeDismissed

  useEffect(() => {
    if (clients.length > 0) {
      setWelcomeDismissed(false)
    }
  }, [clients.length])

  if (isOrgSwitchLoading) {
    return <OrgSwitchMainSkeleton />
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-foreground">
              {getGreeting()}, {user.name}
            </h1>
            <p className="text-foreground/60">
              Here is what&apos;s happening with your clients today
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {getStats(clients, dashboardStats).map((stat, index) => (
            <div
              key={index}
              className="group flex items-center justify-between p-4 rounded-xl border border-black/10 dark:border-white/10 bg-card hover:border-[#5C6ECD]/50 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/5 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5C6ECD] flex items-center justify-center group-hover:bg-[#4A5BC7] transition-colors">
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-foreground/60 font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[#5C6ECD] hover:border-[#5C6ECD] hover:text-white">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* All Clients Section */}
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">All Clients</h2>
          </div>
          <div
            className={cn(
              "relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 transition-opacity duration-200",
              isRefreshingClients && "opacity-50 pointer-events-none"
            )}
          >
            {clients.map((client) => (
              <div key={client.id}>
                <ClientCard
                  client={{
                    ...client,
                    createdOn: formatDate(client.createdAt),
                    interactionDate: formatDate(client.interactionDate),
                    feedbackDate: formatDate(client.feedbackDate),
                  }}
                />
              </div>
            ))}
          </div>

          {isRefreshingClients && (
            <div className="absolute inset-0 top-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/40 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-[#5C6ECD]" />
              <p className="text-sm font-medium text-foreground/80">{refreshOverlayMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Welcome Modal - No Clients */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              className="absolute top-4 right-4 p-1 text-[#999] hover:text-[#1a1a1a] dark:hover:text-white transition-colors"
              aria-label="Close welcome dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-5">
              <img src={publicPath("/Logo/Artboard_5-welcome-140.png")} srcSet={`${publicPath("/Logo/Artboard_5-welcome-140.png")} 1x, ${publicPath("/Logo/Artboard_5-welcome-280.png")} 2x`} alt="Revue" width={140} height={43} className="dark:hidden" />
              <img src={publicPath("/Logo/Artboard_1-welcome-140.png")} srcSet={`${publicPath("/Logo/Artboard_1-welcome-140.png")} 1x, ${publicPath("/Logo/Artboard_1-welcome-280.png")} 2x`} alt="Revue" width={140} height={43} className="hidden dark:block" />
            </div>

            <h2 className="text-xl font-bold text-[#1a1a1a] dark:text-white mb-2">
              Welcome!
            </h2>
            <p className="text-sm text-[#666] dark:text-[#999] mb-6 leading-relaxed">
              Get started by adding your first client. You&apos;ll be able to manage their projects, share creatives, and collect feedback — all in one place.
            </p>

            <button
              type="button"
              onClick={() => {
                setWelcomeDismissed(true)
                onAddClient?.()
                window.dispatchEvent(new CustomEvent("revue:open-add-client"))
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white font-medium rounded-xl shadow-lg shadow-[#5C6ECD]/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Your First Client
            </button>

            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              className="mt-3 text-sm text-[#999] hover:text-[#666] dark:hover:text-[#ccc] transition-colors"
            >
              I&apos;ll do this later
            </button>
          </div>
        </div>
      )}

    </main>
  )
}
