"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Users, FolderOpen, MessageSquare, AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { ClientCard } from "./client-card"

interface StudioContentProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  clients: StudioClient[]
}

interface StudioClient {
  id: string
  name: string
  createdAt?: string | null
  interactionDate?: string | null
  feedbackDate?: string | null
  activeProjects: number
  team: { avatar: string; name: string }[]
  additionalMembers: number
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-black/10 dark:border-white/10 bg-card overflow-hidden relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
        <div>
          <div className="h-3 bg-muted rounded w-16 mb-1 animate-pulse" />
          <div className="h-6 bg-muted rounded w-8 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function ClientCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-muted rounded w-2/3 animate-pulse" />
        <div className="h-5 bg-muted rounded w-14 animate-pulse" />
      </div>
      <div className="space-y-2.5 mb-4 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-1.5" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-muted rounded w-full animate-pulse" />
    </div>
  )
}

// Stats will be computed from clients data
const getStats = (clientsData: StudioClient[]) => {
  const totalClients = clientsData.length
  const activeProjects = clientsData.reduce((sum, c) => sum + c.activeProjects, 0)
  const totalTeamMembers = clientsData.reduce((sum, c) => sum + c.team.length + c.additionalMembers, 0)

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
      value: "24",
      icon: MessageSquare,
    },
    {
      label: "QC Pending",
      value: "3",
      icon: AlertCircle,
    },
    {
      label: "Iterations",
      value: String(activeProjects * 4),
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

export function StudioContent({ user, clients }: StudioContentProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

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
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <StatCardSkeleton key={i} />
              ))}
            </>
          ) : (
            getStats(clients).map((stat, index) => (
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
            ))
          )}
        </div>

        {/* All Clients Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">All Clients</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <ClientCardSkeleton key={i} />
                ))}
              </>
            ) : (
              clients.map((client, index) => (
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
              ))
            )}
          </div>
        </div>
      </div>

    </main>
  )
}
