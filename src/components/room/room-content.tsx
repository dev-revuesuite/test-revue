"use client"

import { useState, useRef, useEffect } from "react"
import { Users, FileText, Clock, Download, ChevronDown, Eye, MessageSquare, CheckCircle, Share, AlertCircle, ArrowLeft, Info, Copy, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  name: string
  createdOn: string
  deadline: string
  daysLeft: number
  status: "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"
  projectMode: "Creative Mode" | "Productive Mode"
  team: { avatar: string; name: string }[]
  additionalMembers: number
  completedOn?: string
}

interface ClientRoom {
  id: string
  name: string
  subtitle: string
  logo: string
  avgFeedbackPerIteration: number
  avgIterations: number
  avgResponseTime: number
  primaryFont: string
  secondaryFont: string
  tertiaryFont: string
  colors: string[]
  projects: Project[]
  completedProjects: Project[]
}

type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

const statusConfig: Record<StatusKey, { label: string; icon: typeof FileText; color: string; borderColor: string }> = {
  brief_received: { label: "Brief Received", icon: FileText, color: "bg-[#5C6ECD] text-white", borderColor: "border-[#5C6ECD]" },
  qc_pending: { label: "QC Pending", icon: AlertCircle, color: "bg-amber-500 text-white", borderColor: "border-amber-500" },
  review_qc: { label: "Review QC", icon: Eye, color: "bg-gray-500 text-white", borderColor: "border-gray-500" },
  iteration_shared: { label: "Iteration Shared", icon: Share, color: "bg-blue-500 text-white", borderColor: "border-blue-500" },
  feedback_received: { label: "Feedback Received", icon: Info, color: "bg-orange-500 text-white", borderColor: "border-orange-500" },
  iteration_approved: { label: "Iteration Approved", icon: CheckCircle, color: "bg-green-500 text-white", borderColor: "border-green-500" },
  completed: { label: "Completed", icon: CheckCircle, color: "bg-emerald-500 text-white", borderColor: "border-emerald-500" },
}

const statusList: StatusKey[] = ["brief_received", "qc_pending", "review_qc", "feedback_received", "iteration_shared", "iteration_approved"]

// Skeleton Component
function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="mb-4">
        <div className="h-5 bg-muted rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
      </div>
      <div className="space-y-3 mb-4 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-muted rounded w-full animate-pulse" />
    </div>
  )
}

function AssetsSkeleton() {
  return (
    <div className="lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/10 bg-card shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="w-20 h-14 rounded-lg bg-muted animate-pulse" />
        <div className="flex items-center gap-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-32 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="h-8 bg-muted rounded w-24 animate-pulse" />
      </div>
      <div className="mx-4 mb-4 rounded-xl bg-[#FAFAFA] dark:bg-white/5 p-4 pt-5">
        <div className="flex items-center gap-2">
          <div className="w-24 h-14 rounded-lg bg-muted animate-pulse" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="w-14 h-14 rounded-xl bg-muted animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        <div className="mt-4 h-1.5 bg-muted rounded-full animate-pulse" />
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-card overflow-hidden relative">
          <div className="absolute inset-0 skeleton-shimmer" />
          <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-3 bg-muted rounded w-3/4 mb-1 animate-pulse" />
            <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Sample data
const sampleClientRoom: ClientRoom = {
  id: "1",
  name: "TechVision Labs",
  subtitle: "Here is what happening with your clients today",
  logo: "TV",
  avgFeedbackPerIteration: 8,
  avgIterations: 8,
  avgResponseTime: 8,
  primaryFont: "Gilroy",
  secondaryFont: "IBM Flex Mono",
  tertiaryFont: "IBM Flex Mono",
  colors: ["#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9"],
  projects: [
    { id: "p1", name: "Revitalise Brand Identity", createdOn: "10 July", deadline: "20 July", daysLeft: 10, status: "brief_received", projectMode: "Creative Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=1", name: "Alex" }, { avatar: "https://i.pravatar.cc/150?img=2", name: "Sarah" }, { avatar: "https://i.pravatar.cc/150?img=3", name: "Mike" }, { avatar: "https://i.pravatar.cc/150?img=4", name: "Emma" }], additionalMembers: 2 },
    { id: "p2", name: "Mobile App Redesign", createdOn: "5 July", deadline: "20 July", daysLeft: 10, status: "qc_pending", projectMode: "Creative Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=5", name: "John" }, { avatar: "https://i.pravatar.cc/150?img=6", name: "Lisa" }, { avatar: "https://i.pravatar.cc/150?img=7", name: "David" }, { avatar: "https://i.pravatar.cc/150?img=8", name: "Kate" }], additionalMembers: 2 },
    { id: "p3", name: "Website Refresh", createdOn: "1 July", deadline: "20 July", daysLeft: 10, status: "review_qc", projectMode: "Productive Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=9", name: "Tom" }, { avatar: "https://i.pravatar.cc/150?img=10", name: "Amy" }, { avatar: "https://i.pravatar.cc/150?img=11", name: "Chris" }, { avatar: "https://i.pravatar.cc/150?img=12", name: "Nina" }], additionalMembers: 2 },
    { id: "p4", name: "Marketing Collateral", createdOn: "8 July", deadline: "20 July", daysLeft: 10, status: "iteration_shared", projectMode: "Productive Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=13", name: "Ryan" }, { avatar: "https://i.pravatar.cc/150?img=14", name: "Olivia" }, { avatar: "https://i.pravatar.cc/150?img=15", name: "James" }, { avatar: "https://i.pravatar.cc/150?img=16", name: "Sophie" }], additionalMembers: 2 },
    { id: "p5", name: "Social Media Kit", createdOn: "12 July", deadline: "20 July", daysLeft: 10, status: "feedback_received", projectMode: "Productive Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=17", name: "Ben" }, { avatar: "https://i.pravatar.cc/150?img=18", name: "Mia" }, { avatar: "https://i.pravatar.cc/150?img=19", name: "Luke" }, { avatar: "https://i.pravatar.cc/150?img=20", name: "Ella" }], additionalMembers: 2 },
    { id: "p6", name: "Icon Set Design", createdOn: "3 July", deadline: "20 July", daysLeft: 10, status: "iteration_approved", projectMode: "Creative Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=21", name: "Jack" }, { avatar: "https://i.pravatar.cc/150?img=22", name: "Lily" }, { avatar: "https://i.pravatar.cc/150?img=23", name: "Noah" }, { avatar: "https://i.pravatar.cc/150?img=24", name: "Zoe" }], additionalMembers: 2 },
  ],
  completedProjects: [
    { id: "c1", name: "Logo Design Package", createdOn: "1 June", deadline: "15 June", daysLeft: 0, status: "completed", projectMode: "Creative Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=25", name: "Dan" }, { avatar: "https://i.pravatar.cc/150?img=26", name: "Eve" }, { avatar: "https://i.pravatar.cc/150?img=27", name: "Sam" }, { avatar: "https://i.pravatar.cc/150?img=28", name: "Ivy" }], additionalMembers: 1, completedOn: "14 June" },
    { id: "c2", name: "Brand Guidelines V1", createdOn: "10 May", deadline: "30 May", daysLeft: 0, status: "completed", projectMode: "Productive Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=29", name: "Max" }, { avatar: "https://i.pravatar.cc/150?img=30", name: "Ava" }, { avatar: "https://i.pravatar.cc/150?img=31", name: "Leo" }, { avatar: "https://i.pravatar.cc/150?img=32", name: "Mia" }], additionalMembers: 0, completedOn: "28 May" },
    { id: "c3", name: "Pitch Deck Design", createdOn: "15 April", deadline: "30 April", daysLeft: 0, status: "completed", projectMode: "Creative Mode", team: [{ avatar: "https://i.pravatar.cc/150?img=33", name: "Jay" }, { avatar: "https://i.pravatar.cc/150?img=34", name: "Zara" }, { avatar: "https://i.pravatar.cc/150?img=35", name: "Cole" }, { avatar: "https://i.pravatar.cc/150?img=36", name: "Luna" }], additionalMembers: 3, completedOn: "29 April" },
  ],
}

function ProjectCard({ project }: { project: Project }) {
  const status = statusConfig[project.status]
  const StatusIcon = status.icon
  const router = useRouter()

  const getActionButtons = () => {
    switch (project.status) {
      case "brief_received":
        return (
          <Button variant="outline" className="group w-full h-10 font-semibold text-sm border-black/30 dark:border-white/30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black" onClick={() => router.push("/revue-tool")}>
            VIEW BRIEF
            <ArrowRight className="w-4 h-4 btn-arrow" />
          </Button>
        )
      case "qc_pending":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="group h-10 font-semibold text-sm border-black/30 dark:border-white/30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">
              BRIEF
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
            <Button variant="outline" className="group h-10 font-semibold text-sm border-black/30 dark:border-white/30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">
              QC
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
          </div>
        )
      case "review_qc":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Button className="group h-10 font-semibold text-sm bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              BRIEF
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
            <Button variant="outline" className="group h-10 font-semibold text-sm border-b-2 border-b-amber-500 border-t-black/30 border-x-black/30 dark:border-t-white/30 dark:border-x-white/30 hover:bg-muted">
              REVIEW (3)
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
          </div>
        )
      case "iteration_shared":
        return (
          <Button variant="outline" className="group w-full h-10 font-semibold text-sm border-black/30 dark:border-white/30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black" onClick={() => router.push("/revue-tool")}>
            VIEW ITERATION
            <ArrowRight className="w-4 h-4 btn-arrow" />
          </Button>
        )
      case "feedback_received":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Button className="group h-10 font-semibold text-sm bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              BRIEF
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
            <Button variant="outline" className="group h-10 font-semibold text-sm border-b-2 border-b-orange-500 border-t-black/30 border-x-black/30 dark:border-t-white/30 dark:border-x-white/30 hover:bg-muted" onClick={() => router.push("/revue-tool")}>
              FEEDBACK (3)
              <ArrowRight className="w-4 h-4 btn-arrow" />
            </Button>
          </div>
        )
      case "iteration_approved":
        return (
          <Button disabled className="w-full h-10 font-semibold text-sm bg-[#DBFE52]/20 text-[#6B8E23] border border-[#DBFE52]">
            <CheckCircle className="w-4 h-4 mr-2" />
            APPROVED
          </Button>
        )
      case "completed":
        return (
          <Button variant="outline" className="group w-full h-10 font-semibold text-sm border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            VIEW PROJECT
            <ArrowRight className="w-4 h-4 btn-arrow" />
          </Button>
        )
      default:
        return null
    }
  }

  const isCompleted = project.status === "completed"

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col hover:shadow-lg transition-all duration-300 h-fit">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-foreground text-base mb-1">{project.name}</h3>
        <p className="text-xs text-foreground/50">Created on : {project.createdOn}</p>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4 flex-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-foreground/60">
            <Clock className="w-4 h-4" />
            <span>{isCompleted ? "Completed on" : "Deadline"}</span>
          </div>
          <span className="font-semibold text-foreground text-sm">
            {isCompleted ? project.completedOn : `${project.deadline} (${project.daysLeft} Days Left)`}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-foreground/60">
            <FileText className="w-4 h-4" />
            <span>Status</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-foreground/60">
            <FileText className="w-4 h-4" />
            <span>Project mode</span>
          </div>
          {project.projectMode === "Creative Mode" ? (
            <span className="creative-mode-text text-sm font-semibold">
              Creative Mode
            </span>
          ) : (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Productive Mode
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-foreground/60">
            <Users className="w-4 h-4" />
            <span>Team</span>
          </div>
          <div className="flex items-center -space-x-2">
            {project.team.slice(0, 4).map((member, index) => (
              <Avatar key={index} className="w-7 h-7 border-2 border-card">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="text-[9px] bg-[#5C6ECD] text-white">{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
            {project.additionalMembers > 0 && (
              <div className="w-7 h-7 rounded-full bg-[#DBFE52] text-black text-[10px] font-bold flex items-center justify-center border-2 border-card">+{project.additionalMembers}</div>
            )}
          </div>
        </div>
      </div>

      {getActionButtons()}
    </div>
  )
}

interface RoomContentProps {
  clientId?: string
}

export function RoomContent({ clientId }: RoomContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const client = sampleClientRoom

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { label: "Average feedback per iteration", value: client.avgFeedbackPerIteration, icon: Users },
    { label: "Average number of iteration", value: client.avgIterations, icon: FileText },
    { label: "Average time to respond", value: client.avgResponseTime, icon: Info },
  ]

  const displayProjects = activeTab === "completed"
    ? client.completedProjects
    : selectedStatus
      ? client.projects.filter(p => p.status === selectedStatus)
      : client.projects

  const getDropdownLabel = () => {
    if (selectedStatus) {
      return statusConfig[selectedStatus].label
    }
    return "On-going projects"
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-4 lg:p-5 h-full flex flex-col">
        {/* Back Button, Header and Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{client.name}&apos;s Room</h1>
              <p className="text-xs text-foreground/60">{client.subtitle}</p>
            </div>
          </div>

          {/* Tabs moved here */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setActiveTab("ongoing"); setDropdownOpen(!dropdownOpen) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                  activeTab === "ongoing"
                    ? "border-[#5C6ECD] bg-[#5C6ECD]/5 text-[#5C6ECD]"
                    : "border-black/10 dark:border-white/10 text-foreground/60 hover:border-black/20 dark:hover:border-white/20"
                }`}
              >
                {selectedStatus && (
                  <span className={`w-5 h-5 rounded flex items-center justify-center ${statusConfig[selectedStatus].color}`}>
                    {(() => { const Icon = statusConfig[selectedStatus].icon; return <Icon className="w-3 h-3" /> })()}
                  </span>
                )}
                {getDropdownLabel()}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => { setSelectedStatus(null); setDropdownOpen(false) }}
                      className={`w-full px-3 py-2.5 text-left text-sm rounded-lg transition-colors flex items-center gap-3 ${
                        !selectedStatus ? "bg-[#5C6ECD]/10 text-[#5C6ECD] font-semibold" : "hover:bg-muted text-foreground/80"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-foreground/10 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      All Projects
                      {!selectedStatus && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                    {statusList.map((statusKey) => {
                      const config = statusConfig[statusKey]
                      const StatusIcon = config.icon
                      const isSelected = selectedStatus === statusKey
                      return (
                        <button
                          key={statusKey}
                          onClick={() => { setSelectedStatus(statusKey); setDropdownOpen(false) }}
                          className={`w-full px-3 py-2.5 text-left text-sm rounded-lg transition-colors flex items-center gap-3 ${
                            isSelected ? "bg-[#5C6ECD]/10 text-[#5C6ECD] font-semibold" : "hover:bg-muted text-foreground/80"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${config.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                          </span>
                          {config.label}
                          {isSelected && <CheckCircle className="w-4 h-4 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setActiveTab("completed"); setSelectedStatus(null); setDropdownOpen(false) }}
              className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                activeTab === "completed"
                  ? "border-emerald-500 bg-emerald-500/5 text-emerald-600"
                  : "border-black/10 dark:border-white/10 text-foreground/60 hover:border-black/20 dark:hover:border-white/20"
              }`}
            >
              COMPLETED PROJECTS
            </button>
          </div>
        </div>

        {/* Top Section - Stats and Assets */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
          {/* Stats Cards */}
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="flex flex-col gap-2">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-card">
                  <div className="w-9 h-9 rounded-lg bg-[#5C6ECD] flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground/60 leading-tight">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assets Section */}
          {isLoading ? (
            <AssetsSkeleton />
          ) : (
            <div className="lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/10 bg-card shadow-sm">
              {/* Logo and Fonts Row */}
              <div className="flex items-center justify-between p-5 pb-4">
                <div className="w-20 h-14 rounded-lg bg-black flex items-center justify-center">
                  <span className="text-white font-bold text-xs tracking-wide">{client.logo}</span>
                </div>
                <div className="flex items-center gap-10">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground/50">Primary :</span>
                    <span className="font-semibold">{client.primaryFont}</span>
                    <Download className="w-4 h-4 text-foreground/40 cursor-pointer hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground/50">Secondary :</span>
                    <span className="font-semibold">{client.secondaryFont}</span>
                    <Download className="w-4 h-4 text-foreground/40 cursor-pointer hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground/50">Tertiary :</span>
                    <span className="font-semibold">{client.tertiaryFont}</span>
                    <Download className="w-4 h-4 text-foreground/40 cursor-pointer hover:text-foreground transition-colors" />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="font-semibold text-xs border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-4">EDIT ASSETS</Button>
              </div>

              {/* Color Palette Container */}
              <div className="mx-4 mb-4 rounded-xl bg-[#FAFAFA] dark:bg-white/5 p-4 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 overflow-x-auto color-palette-scroll pb-1">
                    <div className="flex items-center gap-2">
                      {client.colors.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => navigator.clipboard.writeText(color)}
                          className="group relative flex-shrink-0 cursor-pointer"
                          title={`Click to copy ${color}`}
                        >
                          {index === 0 ? (
                            <div className="flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-lg bg-[#1a1a2e] hover:bg-[#16162a] transition-colors">
                              <div className="w-9 h-9 rounded-md" style={{ backgroundColor: color }} />
                              <div className="flex items-center gap-1.5">
                                <Copy className="w-3 h-3 text-white/40" />
                                <span className="text-[11px] font-mono text-white/70">{color}</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-14 h-14 rounded-xl hover:scale-105 transition-transform duration-200"
                              style={{ backgroundColor: color }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-foreground/40 ml-4 flex-shrink-0 pt-4">See more</span>
                </div>

                {/* Scrollbar Track */}
                <div className="mt-4 h-1.5 bg-[#5C6ECD]/15 rounded-full">
                  <div className="h-full w-1/2 bg-[#5C6ECD]/40 rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-auto content-start">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </>
          ) : (
            displayProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </div>
    </main>
  )
}
