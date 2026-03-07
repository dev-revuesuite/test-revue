"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  FolderOpen,
  CalendarDays,
  Clock,
  Users,
  ArrowRight,
  Search,
  Palette,
  Briefcase,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface ZoneProject {
  id: string
  name: string
  type: string
  clientName: string
  clientLogoUrl?: string
  clientId: string
  status: string
  startDate?: string | null
  endDate?: string | null
  daysLeft: number
  createdAt: string
  team: { name: string; avatar?: string }[]
  creativesCount: number
}

interface ZoneContentProps {
  zone: "creative" | "productive"
  projects: ZoneProject[]
}

const statusLabels: Record<string, string> = {
  brief_received: "Brief Received",
  qc_pending: "QC Pending",
  review_qc: "Review QC",
  iteration_shared: "Iteration Shared",
  feedback_received: "Feedback Received",
  iteration_approved: "Approved",
  completed: "Completed",
  active: "Active",
}

const statusColors: Record<string, string> = {
  brief_received: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qc_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  review_qc: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  iteration_shared: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  feedback_received: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  iteration_approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-muted rounded w-2/3 animate-pulse" />
        <div className="h-5 bg-muted rounded w-14 animate-pulse" />
      </div>
      <div className="space-y-2.5 mb-4 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-muted rounded w-full animate-pulse" />
    </div>
  )
}

export function ZoneContent({ zone, projects }: ZoneContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  )

  const isCreative = zone === "creative"
  const ZoneIcon = isCreative ? Palette : Briefcase
  const accentColor = isCreative ? "#A259FF" : "#5C6ECD"
  const accentBg = isCreative
    ? "bg-[#A259FF]"
    : "bg-[#5C6ECD]"

  const formatDate = (value?: string | null) => {
    if (!value) return "—"
    try {
      return format(new Date(value), "d MMM yyyy")
    } catch {
      return "—"
    }
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center`}
            >
              <ZoneIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isCreative ? "Creative Zone" : "Productive Zone"}
              </h1>
              <p className="text-foreground/60 text-sm">
                {isCreative
                  ? "Projects focused on design, branding, and creative work"
                  : "Projects focused on production, delivery, and execution"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 h-10"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Projects", value: String(projects.length), icon: FolderOpen },
            {
              label: "In Progress",
              value: String(
                projects.filter(
                  (p) =>
                    !["completed", "iteration_approved"].includes(p.status)
                ).length
              ),
              icon: Clock,
            },
            {
              label: "Completed",
              value: String(
                projects.filter((p) =>
                  ["completed", "iteration_approved"].includes(p.status)
                ).length
              ),
              icon: CalendarDays,
            },
            {
              label: "Team Members",
              value: String(
                new Set(projects.flatMap((p) => p.team.map((t) => t.name))).size
              ),
              icon: Users,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-card"
            >
              <div
                className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-foreground/60 font-medium">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              All Projects ({filtered.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className={`w-16 h-16 rounded-2xl ${accentBg}/10 flex items-center justify-center mb-4`}
              >
                <ZoneIcon
                  className="w-8 h-8"
                  style={{ color: accentColor }}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No projects found
              </h3>
              <p className="text-foreground/60 text-sm max-w-sm">
                {search
                  ? "Try adjusting your search terms"
                  : `No ${zone} projects yet. Create a new brief and set the workmode to "${zone}" to see it here.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="group rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col hover:border-[color:var(--accent)]/60 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/5 transition-all duration-300 hover:-translate-y-1"
                  style={
                    { "--accent": accentColor } as React.CSSProperties
                  }
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {project.clientLogoUrl ? (
                        <img
                          src={project.clientLogoUrl}
                          alt={project.clientName}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center shrink-0`}
                        >
                          <span className="text-white font-bold text-xs">
                            {project.clientName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3
                          className="font-bold text-base truncate"
                          style={{ color: accentColor }}
                        >
                          {project.name}
                        </h3>
                        <p className="text-[11px] text-foreground/50 truncate">
                          {project.clientName} &middot; {project.type}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${
                        statusColors[project.status] || statusColors.active
                      }`}
                    >
                      {statusLabels[project.status] || project.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center justify-between text-sm py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Deadline</span>
                      </div>
                      <span className="font-semibold text-foreground text-xs">
                        {formatDate(project.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Days Left</span>
                      </div>
                      <span
                        className={`font-semibold text-xs ${
                          project.daysLeft <= 3 && project.daysLeft > 0
                            ? "text-red-500"
                            : project.daysLeft === 0
                            ? "text-foreground/40"
                            : "text-foreground"
                        }`}
                      >
                        {project.daysLeft > 0 ? `${project.daysLeft} days` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Creatives</span>
                      </div>
                      <span className="font-semibold text-foreground text-xs">
                        {project.creativesCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Users className="w-3.5 h-3.5" />
                        <span>Team</span>
                      </div>
                      <div className="flex items-center -space-x-1.5">
                        {project.team.slice(0, 3).map((member, i) => (
                          <Avatar
                            key={i}
                            className="w-6 h-6 border-2 border-card ring-0"
                          >
                            {member.avatar && (
                              <AvatarImage src={member.avatar} />
                            )}
                            <AvatarFallback
                              className={`text-[9px] ${accentBg} text-white font-semibold`}
                            >
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {project.team.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-[#C8E946] text-black text-[9px] font-bold flex items-center justify-center border-2 border-card">
                            +{project.team.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    className="w-full h-9 rounded-lg border-black/20 dark:border-white/20 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-all duration-300 font-semibold text-xs"
                    onClick={() =>
                      router.push(`/brief/${project.id}`)
                    }
                  >
                    VIEW PROJECT
                    <ArrowRight className="w-3.5 h-3.5 btn-arrow" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
