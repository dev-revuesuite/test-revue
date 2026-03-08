"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Search,
  Palette,
  Briefcase,
  Layers,
  Clock,
  Calendar,
  X,
  ArrowRight,
  MessageSquare,
  ExternalLink,
  FileText,
  Download,
  Eye,
  Link2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
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
  references?: { name: string; fileUrl?: string }[]
  externalLinks?: { name: string }[]
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

// Status filter tabs
interface StatusFilter {
  id: string
  label: string
  statuses: string[]
  borderColor: string
  badgeClass: string
}

const statusFilters: StatusFilter[] = [
  {
    id: "all",
    label: "All",
    statuses: [],
    borderColor: "border-l-transparent",
    badgeClass: "",
  },
  {
    id: "todo",
    label: "To Do",
    statuses: ["brief_received", "active"],
    borderColor: "border-l-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "in_progress",
    label: "In Progress",
    statuses: ["qc_pending", "review_qc"],
    borderColor: "border-l-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    id: "review",
    label: "In Review",
    statuses: ["iteration_shared", "feedback_received"],
    borderColor: "border-l-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    id: "done",
    label: "Completed",
    statuses: ["iteration_approved", "completed"],
    borderColor: "border-l-green-400",
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
]

function getFilterForStatus(status: string): StatusFilter {
  return statusFilters.find((f) => f.statuses.includes(status)) || statusFilters[1]
}

function getBadgeForStatus(status: string): { label: string; className: string } {
  const filter = getFilterForStatus(status)
  return {
    label: statusLabels[status] || status,
    className: filter.badgeClass,
  }
}

function getBorderForStatus(status: string): string {
  return getFilterForStatus(status).borderColor
}

// Skeleton
function ListSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-5 w-6 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((card) => (
              <div key={card} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-5 w-2/3 bg-muted rounded" />
                  <div className="h-6 w-24 bg-muted rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ZoneContent({ zone, projects }: ZoneContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedProject, setSelectedProject] = useState<ZoneProject | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const isCreative = zone === "creative"
  const accentColor = isCreative ? "#A259FF" : "#5C6ECD"
  const accentBg = isCreative ? "bg-[#A259FF]" : "bg-[#5C6ECD]"
  const accentHover = isCreative ? "hover:bg-[#9240EE]" : "hover:bg-[#4A5BC7]"

  // Filter by search and status tab
  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())

    const activeFilterObj = statusFilters.find((f) => f.id === activeFilter)
    const matchesStatus =
      activeFilter === "all" || (activeFilterObj?.statuses.includes(p.status) ?? false)

    return matchesSearch && matchesStatus
  })

  // Group filtered projects by client
  const clientGroups = filtered.reduce<
    Record<string, { clientName: string; clientLogoUrl?: string; clientId: string; projects: ZoneProject[] }>
  >((acc, project) => {
    if (!acc[project.clientId]) {
      acc[project.clientId] = {
        clientName: project.clientName,
        clientLogoUrl: project.clientLogoUrl,
        clientId: project.clientId,
        projects: [],
      }
    }
    acc[project.clientId].projects.push(project)
    return acc
  }, {})

  const clientGroupList = Object.values(clientGroups).sort((a, b) =>
    a.clientName.localeCompare(b.clientName)
  )

  // Count projects per status filter
  const filterCounts = statusFilters.map((f) => ({
    ...f,
    count:
      f.id === "all"
        ? projects.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.clientName.toLowerCase().includes(search.toLowerCase()) ||
            p.type.toLowerCase().includes(search.toLowerCase())
          ).length
        : projects.filter(
            (p) =>
              f.statuses.includes(p.status) &&
              (p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.clientName.toLowerCase().includes(search.toLowerCase()) ||
                p.type.toLowerCase().includes(search.toLowerCase()))
          ).length,
  }))

  const formatDate = (value?: string | null) => {
    if (!value) return "—"
    try {
      return format(new Date(value), "d MMM yyyy")
    } catch {
      return "—"
    }
  }

  const formatDateRange = (start?: string | null, end?: string | null) => {
    try {
      const s = start ? format(new Date(start), "MMM d") : null
      const e = end ? format(new Date(end), "MMM d") : null
      if (s && e) return `${s} - ${e}`
      if (s) return `From ${s}`
      if (e) return `Until ${e}`
    } catch { /* ignore */ }
    return "No dates set"
  }

  const totalRefs = (p: ZoneProject) => (p.references?.length || 0) + (p.externalLinks?.length || 0)

  return (
    <main className="flex-1 overflow-hidden bg-background flex">
      {/* Left: Main List Panel */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${selectedProject ? "max-w-[calc(100%-420px)]" : ""}`}>
        <div className="p-4 lg:p-6 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <h1 className="text-xl font-bold text-foreground">
              {isCreative ? "Creative Zone" : "Productive Zone"}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56 h-9 text-sm"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 mb-5 shrink-0 overflow-x-auto pb-1 border-b border-border">
            {filterCounts.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap relative ${
                  activeFilter === filter.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md ${
                    activeFilter === filter.id
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {filter.count}
                  </span>
                )}
                {activeFilter === filter.id && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {isLoading ? (
              <ListSkeleton />
            ) : clientGroupList.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-2xl ${accentBg}/10 flex items-center justify-center mb-4 mx-auto`}>
                    {isCreative ? (
                      <Palette className="w-7 h-7" style={{ color: accentColor }} />
                    ) : (
                      <Briefcase className="w-7 h-7" style={{ color: accentColor }} />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">No projects found</h3>
                  <p className="text-foreground/60 text-sm max-w-sm">
                    {search
                      ? "Try adjusting your search terms"
                      : `No ${zone} projects yet. Create a new brief and set the workmode to "${zone}" to see it here.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-4">
                {clientGroupList.map((group) => (
                  <div key={group.clientId}>
                    {/* Client Header */}
                    <div className="flex items-center gap-3 mb-3">
                      {group.clientLogoUrl ? (
                        <img
                          src={group.clientLogoUrl}
                          alt={group.clientName}
                          className="w-9 h-9 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center shrink-0`}>
                          <span className="text-white font-bold text-[11px]">
                            {group.clientName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h2 className="font-semibold text-[15px] text-foreground">{group.clientName}</h2>
                      <span className="text-[11px] font-semibold text-foreground/30 bg-foreground/5 rounded-md px-1.5 py-0.5 min-w-[22px] text-center">
                        {group.projects.length}
                      </span>
                    </div>

                    {/* Project Cards */}
                    <div className="space-y-2.5">
                      {group.projects.map((project) => {
                        const badge = getBadgeForStatus(project.status)
                        const borderColor = getBorderForStatus(project.status)
                        const isSelected = selectedProject?.id === project.id
                        return (
                          <div
                            key={project.id}
                            onClick={() => setSelectedProject(isSelected ? null : project)}
                            className={`rounded-2xl border-l-[3px] bg-card border border-border/60 px-5 py-4 cursor-pointer transition-all duration-200 hover:shadow-md ${borderColor} ${
                              isSelected ? "shadow-md ring-2" : ""
                            }`}
                            style={isSelected ? { "--tw-ring-color": accentColor } as React.CSSProperties : undefined}
                          >
                            {/* Row 1: Name + Badge */}
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <h4 className="font-semibold text-[15px] text-foreground leading-snug">
                                {project.name}
                              </h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>

                            {/* Row 2: Meta */}
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                {project.daysLeft > 0 ? `${project.daysLeft} Days left` : "No deadline"}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs">
                                <Layers className="w-3.5 h-3.5" />
                                {project.creativesCount}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {project.team.length}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Detail Panel */}
      {selectedProject && (
        <div className="w-[420px] border-l border-border bg-card flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/room?client=${selectedProject.clientId}`)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Open Room
              </button>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <button
              onClick={() => setSelectedProject(null)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Category & Title */}
              <div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <Layers className="w-3.5 h-3.5" />
                  {selectedProject.type}
                </div>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {selectedProject.name}
                </h2>
              </div>

              {/* Status & Dates */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const badge = getBadgeForStatus(selectedProject.status)
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  )
                })()}
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {formatDateRange(selectedProject.startDate, selectedProject.endDate)}
                </span>
              </div>

              {/* Days Left Card */}
              {selectedProject.daysLeft > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground font-medium">Days Remaining</span>
                  </div>
                  <span className={`text-xl font-bold tabular-nums ${
                    selectedProject.daysLeft <= 3 ? "text-red-500" : "text-foreground"
                  }`}>
                    {selectedProject.daysLeft}
                  </span>
                </div>
              )}

              {/* Client Info */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Client
                </h3>
                <div className="flex items-center gap-3">
                  {selectedProject.clientLogoUrl ? (
                    <img
                      src={selectedProject.clientLogoUrl}
                      alt={selectedProject.clientName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center`}>
                      <span className="text-white font-bold text-xs">
                        {selectedProject.clientName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="font-semibold text-sm text-foreground">{selectedProject.clientName}</p>
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Project Type</span>
                    <span className="text-sm font-medium text-foreground">{selectedProject.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Creatives</span>
                    <span className="text-sm font-medium text-foreground">{selectedProject.creativesCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Start Date</span>
                    <span className="text-sm font-medium text-foreground">{formatDate(selectedProject.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Deadline</span>
                    <span className="text-sm font-medium text-foreground">{formatDate(selectedProject.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium text-foreground">{formatDate(selectedProject.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* References */}
              {(selectedProject.references && selectedProject.references.length > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    References
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.references.map((ref, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {ref.name}
                          </span>
                        </div>
                        {ref.fileUrl && (
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <a
                              href={ref.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </a>
                            <a
                              href={ref.fileUrl}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {(selectedProject.externalLinks && selectedProject.externalLinks.length > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    External Links
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.externalLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.name.startsWith("http") ? link.name : `https://${link.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {link.name}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              {selectedProject.team.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Team
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.team.map((member, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          {member.avatar && <AvatarImage src={member.avatar} />}
                          <AvatarFallback className={`text-xs ${accentBg} text-white font-semibold`}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-5 py-4 border-t border-border shrink-0">
            <button
              onClick={() => router.push(`/room?client=${selectedProject.clientId}`)}
              className={`w-full ${accentBg} ${accentHover} text-white rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2`}
            >
              Open in Room
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
