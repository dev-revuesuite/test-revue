"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Palette,
  FileText,
  Rocket,
  Megaphone,
  Code,
  PenTool,
  Film,
  LayoutGrid,
  Check,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Types
interface TeamMember {
  id: string
  name: string
  avatar: string
  color: string
}

interface Project {
  id: string
  name: string
  client: string
  clientIcon: "logo" | "homepage" | "marketing" | "contact" | "brand" | "animation" | "tech"
  startDate: Date
  endDate: Date
  color: string
  gradient?: string
  assignees: string[]
  progress: number
  status: "active" | "completed" | "paused"
  row: number
  milestones?: { date: Date; label: string }[]
  connectedTo?: string
}

// Sample data
const teamMembers: TeamMember[] = [
  { id: "1", name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?img=1", color: "bg-rose-500" },
  { id: "2", name: "Jacob Hawkins", avatar: "https://i.pravatar.cc/150?img=2", color: "bg-amber-500" },
  { id: "3", name: "Regina Cooper", avatar: "https://i.pravatar.cc/150?img=3", color: "bg-emerald-500" },
  { id: "4", name: "Mike Johnson", avatar: "https://i.pravatar.cc/150?img=4", color: "bg-violet-500" },
  { id: "5", name: "Jane Wilson", avatar: "https://i.pravatar.cc/150?img=5", color: "bg-blue-500" },
]

const sampleProjects: Project[] = [
  {
    id: "1",
    name: "Spline animated logo",
    client: "Logo",
    clientIcon: "logo",
    startDate: new Date(2024, 11, 23),
    endDate: new Date(2025, 0, 2),
    color: "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700",
    assignees: ["1", "2"],
    progress: 75,
    status: "active",
    row: 0,
    milestones: [{ date: new Date(2024, 11, 28), label: "Review" }]
  },
  {
    id: "2",
    name: "Product page",
    client: "About us",
    clientIcon: "homepage",
    startDate: new Date(2024, 11, 20),
    endDate: new Date(2024, 11, 28),
    color: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    assignees: ["2", "3"],
    progress: 100,
    status: "completed",
    row: 1
  },
  {
    id: "3",
    name: "New microdose website",
    client: "New Homepage",
    clientIcon: "homepage",
    startDate: new Date(2024, 11, 30),
    endDate: new Date(2025, 0, 8),
    color: "bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-rose-900/40",
    gradient: "from-amber-200 via-orange-200 to-rose-200",
    assignees: ["1", "2", "3", "4"],
    progress: 45,
    status: "active",
    row: 1,
    connectedTo: "2"
  },
  {
    id: "4",
    name: "Input Styleguide",
    client: "Contact",
    clientIcon: "contact",
    startDate: new Date(2024, 11, 26),
    endDate: new Date(2025, 0, 4),
    color: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
    assignees: ["2", "3", "4"],
    progress: 60,
    status: "active",
    row: 2,
    milestones: [{ date: new Date(2024, 11, 30), label: "Design Complete" }]
  },
  {
    id: "5",
    name: "Microdose pricing",
    client: "New Homepage",
    clientIcon: "homepage",
    startDate: new Date(2024, 11, 22),
    endDate: new Date(2024, 11, 31),
    color: "bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600",
    assignees: ["1", "3"],
    progress: 90,
    status: "active",
    row: 3
  },
  {
    id: "6",
    name: "Sales deck - iteration ver. 1",
    client: "Marketing",
    clientIcon: "marketing",
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 10),
    color: "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700",
    assignees: ["2", "4", "5"],
    progress: 20,
    status: "active",
    row: 3,
    connectedTo: "5"
  },
  {
    id: "7",
    name: "Branding Behance",
    client: "Brand book",
    clientIcon: "brand",
    startDate: new Date(2024, 11, 24),
    endDate: new Date(2025, 0, 3),
    color: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
    assignees: ["1", "4"],
    progress: 55,
    status: "active",
    row: 4
  },
  {
    id: "8",
    name: "Demo reel",
    client: "Animation 2nd",
    clientIcon: "animation",
    startDate: new Date(2025, 0, 2),
    endDate: new Date(2025, 0, 12),
    color: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    assignees: ["3", "5"],
    progress: 10,
    status: "active",
    row: 4,
    connectedTo: "7"
  },
  {
    id: "9",
    name: "Case studies",
    client: "FinTech work",
    clientIcon: "tech",
    startDate: new Date(2025, 0, 6),
    endDate: new Date(2025, 0, 15),
    color: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700",
    assignees: ["1", "2", "5"],
    progress: 5,
    status: "active",
    row: 0
  },
]

const clientIcons: Record<string, React.ReactNode> = {
  logo: <Palette className="w-3 h-3" />,
  homepage: <Rocket className="w-3 h-3" />,
  marketing: <Megaphone className="w-3 h-3" />,
  contact: <PenTool className="w-3 h-3" />,
  brand: <FileText className="w-3 h-3" />,
  animation: <Film className="w-3 h-3" />,
  tech: <Code className="w-3 h-3" />,
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

export function TimelineContent() {
  const [viewType, setViewType] = useState<"day" | "week" | "month">("week")
  const [currentDate, setCurrentDate] = useState(new Date(2024, 11, 26)) // Dec 26, 2024
  const [showDone, setShowDone] = useState(true)
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayLineRef = useRef<HTMLDivElement>(null)

  // Get the date range for the view
  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewType === "day") {
      return { start, end, days: 1 }
    } else if (viewType === "week") {
      // Get 2 weeks before and 2 weeks after
      start.setDate(start.getDate() - 7)
      end.setDate(end.getDate() + 14)
      return { start, end, days: 21 }
    } else {
      // Month view - show full month plus some days
      start.setDate(1)
      end.setMonth(end.getMonth() + 1)
      end.setDate(15)
      return { start, end, days: 45 }
    }
  }

  const { start: rangeStart, days: totalDays } = getDateRange()

  // Generate array of dates
  const getDates = () => {
    const dates: Date[] = []
    const current = new Date(rangeStart)
    for (let i = 0; i < totalDays; i++) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  const dates = getDates()

  // Group dates by month
  const getMonthGroups = () => {
    const groups: { month: string; year: number; startIndex: number; count: number }[] = []
    let currentMonth = -1
    let currentYear = -1

    dates.forEach((date, index) => {
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
        currentMonth = date.getMonth()
        currentYear = date.getFullYear()
        groups.push({
          month: date.toLocaleDateString("en-US", { month: "long" }),
          year: date.getFullYear(),
          startIndex: index,
          count: 1
        })
      } else {
        groups[groups.length - 1].count++
      }
    })
    return groups
  }

  const monthGroups = getMonthGroups()

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  // Check if date is the current view date
  const isCurrentDate = (date: Date) => {
    return date.getDate() === currentDate.getDate() &&
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
  }

  // Get project position and width
  const getProjectStyle = (project: Project) => {
    const startIndex = dates.findIndex(d =>
      d.getDate() === project.startDate.getDate() &&
      d.getMonth() === project.startDate.getMonth() &&
      d.getFullYear() === project.startDate.getFullYear()
    )
    const endIndex = dates.findIndex(d =>
      d.getDate() === project.endDate.getDate() &&
      d.getMonth() === project.endDate.getMonth() &&
      d.getFullYear() === project.endDate.getFullYear()
    )

    const DAY_WIDTH = viewType === "week" ? 56 : viewType === "day" ? 80 : 40 // pixels per day

    // Handle projects that extend beyond visible range
    const visibleStart = Math.max(0, startIndex)
    const visibleEnd = endIndex === -1 ? dates.length - 1 : Math.min(dates.length - 1, endIndex)

    if (visibleStart > dates.length - 1 || visibleEnd < 0) {
      return null // Project not visible
    }

    return {
      left: visibleStart * DAY_WIDTH,
      width: (visibleEnd - visibleStart + 1) * DAY_WIDTH - 8,
      isPartialStart: startIndex < 0,
      isPartialEnd: endIndex === -1 || endIndex > dates.length - 1
    }
  }

  // Navigate dates
  const navigate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    const amount = viewType === "day" ? 1 : viewType === "week" ? 7 : 30
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - amount)
    } else {
      newDate.setDate(newDate.getDate() + amount)
    }
    setCurrentDate(newDate)
  }

  // Format date range display
  const formatDateRange = () => {
    const end = new Date(currentDate)
    end.setDate(end.getDate() + (viewType === "week" ? 7 : viewType === "day" ? 0 : 30))

    const startStr = currentDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })
    const endStr = end.toLocaleDateString("en-US", { day: "numeric", month: "short" })

    return `${startStr} - ${endStr}`
  }

  // Get assignee avatars
  const getAssignees = (assigneeIds: string[]) => {
    return assigneeIds.map(id => teamMembers.find(m => m.id === id)).filter(Boolean) as TeamMember[]
  }

  // Filter projects
  const filteredProjects = showDone
    ? projects
    : projects.filter(p => p.status !== "completed")

  // Row height
  const ROW_HEIGHT = 80
  const maxRow = Math.max(...projects.map(p => p.row)) + 1
  const DAY_WIDTH = viewType === "week" ? 56 : viewType === "day" ? 80 : 40

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = dates.findIndex(d => isToday(d))
      if (todayIndex !== -1) {
        const scrollTo = Math.max(0, (todayIndex - 3) * DAY_WIDTH)
        scrollRef.current.scrollLeft = scrollTo
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Timeline</h1>
            <p className="text-muted-foreground text-sm">
              Detailed, visual representation of a project's journey, highlighting key milestones, progress updates, and upcoming tasks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Team avatars */}
            <div className="flex -space-x-2 mr-2">
              {teamMembers.slice(0, 4).map(member => (
                <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className={member.color}>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              {teamMembers.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{teamMembers.length - 4}
                </div>
              )}
            </div>
            <Button size="sm" className="bg-[#5C6ECD] hover:bg-[#4a5bb8] gap-1">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["day", "week", "month"] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                    viewType === view
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("prev")}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {formatDateRange()}
              </span>
              <button
                onClick={() => navigate("next")}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Show done toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-muted-foreground">Show done</span>
              <button
                onClick={() => setShowDone(!showDone)}
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors",
                  showDone ? "bg-[#5C6ECD]" : "bg-muted"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow",
                  showDone ? "translate-x-5" : "translate-x-1"
                )} />
              </button>
            </label>

            {/* Sort */}
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>

            {/* Filter */}
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-auto">
          <div style={{ minWidth: dates.length * DAY_WIDTH, minHeight: maxRow * ROW_HEIGHT + 100 }}>
            {/* Month Headers */}
            <div className="sticky top-0 z-20 bg-background border-b border-border">
              <div className="flex h-8">
                {monthGroups.map((group, i) => (
                  <div
                    key={i}
                    style={{ width: group.count * DAY_WIDTH }}
                    className="flex items-center px-3 text-sm font-semibold border-r border-border"
                  >
                    {group.month} {group.year}
                    {i === monthGroups.length - 1 && group.count < 5 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        '{group.year.toString().slice(-2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Day Headers */}
              <div className="flex h-12 border-b border-border">
                {dates.map((date, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "flex flex-col items-center justify-center text-sm border-r border-border/50 shrink-0",
                      isCurrentDate(date) && "bg-[#5C6ECD]/10",
                      isToday(date) && "bg-[#5C6ECD]/20"
                    )}
                  >
                    <span className={cn(
                      "text-xs",
                      isToday(date) ? "text-[#5C6ECD] font-semibold" : "text-muted-foreground"
                    )}>
                      {DAYS[date.getDay()]}
                    </span>
                    <span className={cn(
                      "font-medium",
                      isToday(date) ? "text-[#5C6ECD]" : ""
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Body */}
            <div className="relative" style={{ height: maxRow * ROW_HEIGHT }}>
              {/* Vertical grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dates.map((date, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "h-full border-r shrink-0",
                      isCurrentDate(date)
                        ? "bg-[#5C6ECD]/5 border-[#5C6ECD]/20"
                        : "border-border/30"
                    )}
                  />
                ))}
              </div>

              {/* Today line */}
              {dates.some(d => isToday(d)) && (
                <div
                  ref={todayLineRef}
                  className="absolute top-0 bottom-0 w-0.5 bg-[#5C6ECD] z-10"
                  style={{
                    left: dates.findIndex(d => isToday(d)) * DAY_WIDTH + DAY_WIDTH / 2
                  }}
                >
                  <div className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-[#5C6ECD]" />
                </div>
              )}

              {/* Connection lines */}
              {filteredProjects.filter(p => p.connectedTo).map(project => {
                const connectedProject = projects.find(p => p.id === project.connectedTo)
                if (!connectedProject) return null

                const style1 = getProjectStyle(connectedProject)
                const style2 = getProjectStyle(project)
                if (!style1 || !style2) return null

                const startX = style1.left + style1.width
                const startY = connectedProject.row * ROW_HEIGHT + ROW_HEIGHT / 2
                const endX = style2.left
                const endY = project.row * ROW_HEIGHT + ROW_HEIGHT / 2

                return (
                  <svg
                    key={`connection-${project.id}`}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-5"
                    style={{ overflow: "visible" }}
                  >
                    <path
                      d={`M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="text-muted-foreground/40"
                    />
                    <circle cx={startX} cy={startY} r="4" className="fill-emerald-500" />
                    <polygon
                      points={`${endX},${endY} ${endX - 8},${endY - 4} ${endX - 8},${endY + 4}`}
                      className="fill-rose-400"
                    />
                  </svg>
                )
              })}

              {/* Project bars */}
              {filteredProjects.map(project => {
                const style = getProjectStyle(project)
                if (!style) return null

                const assignees = getAssignees(project.assignees)

                return (
                  <div
                    key={project.id}
                    className={cn(
                      "absolute rounded-xl border shadow-sm cursor-pointer group transition-all hover:shadow-md hover:scale-[1.02]",
                      project.gradient ? `bg-gradient-to-r ${project.gradient}` : project.color,
                      project.status === "completed" && "opacity-60"
                    )}
                    style={{
                      left: style.left + 4,
                      top: project.row * ROW_HEIGHT + 12,
                      width: style.width,
                      height: ROW_HEIGHT - 24,
                      borderLeftWidth: style.isPartialStart ? 0 : undefined,
                      borderRightWidth: style.isPartialEnd ? 0 : undefined,
                      borderRadius: style.isPartialStart ? "0 12px 12px 0" : style.isPartialEnd ? "12px 0 0 12px" : undefined
                    }}
                  >
                    <div className="h-full flex items-center justify-between px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {clientIcons[project.clientIcon]}
                          <span className="truncate">{project.client}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Assignee avatars */}
                        <div className="flex -space-x-1.5">
                          {assignees.slice(0, 3).map(member => (
                            <Avatar key={member.id} className="w-6 h-6 border-2 border-background">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className={cn("text-[10px] text-white", member.color)}>
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                              +{assignees.length - 3}
                            </div>
                          )}
                        </div>

                        {/* More options */}
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-all">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Progress indicator at bottom */}
                    {project.progress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10 rounded-b-xl overflow-hidden">
                        <div
                          className="h-full bg-[#5C6ECD]"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Completed checkmark */}
                    {project.status === "completed" && (
                      <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Milestones */}
              {filteredProjects.flatMap(project =>
                (project.milestones || []).map(milestone => {
                  const milestoneIndex = dates.findIndex(d =>
                    d.getDate() === milestone.date.getDate() &&
                    d.getMonth() === milestone.date.getMonth() &&
                    d.getFullYear() === milestone.date.getFullYear()
                  )
                  if (milestoneIndex === -1) return null

                  return (
                    <div
                      key={`${project.id}-${milestone.label}`}
                      className="absolute z-10"
                      style={{
                        left: milestoneIndex * DAY_WIDTH + DAY_WIDTH / 2 - 6,
                        top: project.row * ROW_HEIGHT + ROW_HEIGHT / 2 - 6
                      }}
                    >
                      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-background shadow-md" />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
