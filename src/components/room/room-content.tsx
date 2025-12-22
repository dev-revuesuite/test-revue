"use client"

import { useState, useEffect } from "react"
import {
  Users, FileText, Clock, Download, ChevronDown, Eye, MessageSquare,
  CheckCircle, Share, AlertCircle, ArrowLeft, Info, Copy, Plus,
  Briefcase, Calendar, Palette, Type, Image as ImageIcon,
  Trash2, MoreHorizontal, ExternalLink, Search,
  Sparkles, Zap, Building2, Target, CalendarDays, FolderOpen, Globe, Edit3, FileCheck,
  X, UserPlus, Pencil, ScanSearch, ChevronUp, FolderKanban, CircleDot, Upload, CircleCheck,
  Settings, Layers, Link, Play, LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Types
interface DeliverableStage {
  id: string
  stage: string
  description: string
  date: string
}

interface TeamMember {
  id: string
  name: string
  role: string
  avatar?: string
}

interface Reference {
  id: string
  name: string
  url?: string
  size?: string
}

interface ExternalLinkItem {
  id: string
  name: string
  url?: string
}

interface NamingColumn {
  id: string
  value: string
}

interface Creative {
  id: string
  name: string
  type: "Image" | "Video" | "Document" | "Website"
  thumbnail: string
  iterations: number
  activeFeedbacks: number
  status: "in_review" | "approved" | "pending" | "revision"
  lastUpdated: string
  dimensions?: string
}

type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

interface Project {
  id: string
  name: string
  description?: string
  clientName: string
  projectType: string
  industry?: string
  deliverable?: string
  scopeDescription?: string
  startDate?: string
  endDate?: string
  endTime?: string
  deliverableStages?: DeliverableStage[]
  accountManager?: string
  accountManagerAvatar?: string
  autoDeleteIteration?: string
  needQCTool?: boolean
  workmode?: "productive" | "creative"
  team: TeamMember[]
  references?: Reference[]
  externalLinks?: ExternalLinkItem[]
  namingColumns?: NamingColumn[]
  otherDescription?: string
  createdOn: string
  deadline: string
  daysLeft: number
  status: StatusKey
  additionalMembers: number
  colors?: string[]
  primaryFont?: string
  secondaryFont?: string
  tertiaryFont?: string
  completedOn?: string
  budget?: string
  creatives?: Creative[]
}

interface ClientRoom {
  id: string
  name: string
  subtitle: string
  logo: string
  logoUrl?: string
  primaryFont: string
  secondaryFont: string
  tertiaryFont: string
  colors: string[]
  projects: Project[]
  completedProjects: Project[]
}

const statusConfig: Record<StatusKey, { label: string; icon: typeof FileText; color: string; bgColor: string; iconBg: string; tagBg: string }> = {
  brief_received: { label: "Brief Received", icon: FileText, color: "text-[#5C6ECD]", bgColor: "bg-[#5C6ECD]", iconBg: "bg-blue-500/10", tagBg: "bg-[#5C6ECD]/10 text-[#5C6ECD] border-[#5C6ECD]/20" },
  qc_pending: { label: "QC Pending", icon: CircleDot, color: "text-amber-500", bgColor: "bg-amber-500", iconBg: "bg-amber-500/10", tagBg: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  review_qc: { label: "Review QC", icon: Eye, color: "text-purple-500", bgColor: "bg-purple-500", iconBg: "bg-purple-500/10", tagBg: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  iteration_shared: { label: "Iteration Shared", icon: Upload, color: "text-blue-500", bgColor: "bg-blue-500", iconBg: "bg-blue-500/10", tagBg: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  feedback_received: { label: "Feedback Received", icon: MessageSquare, color: "text-orange-500", bgColor: "bg-orange-500", iconBg: "bg-orange-500/10", tagBg: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  iteration_approved: { label: "Iteration Approved", icon: CircleCheck, color: "text-green-500", bgColor: "bg-green-500", iconBg: "bg-green-500/10", tagBg: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500", iconBg: "bg-emerald-500/10", tagBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
}

const statusList: StatusKey[] = ["brief_received", "qc_pending", "review_qc", "iteration_shared", "feedback_received", "iteration_approved"]

// Sample data
const sampleClientRoom: ClientRoom = {
  id: "1",
  name: "Dropbox, Inc.",
  subtitle: "App Development",
  logo: "DB",
  logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Dropbox_Icon.svg/120px-Dropbox_Icon.svg.png",
  primaryFont: "Gilroy",
  secondaryFont: "IBM Flex Mono",
  tertiaryFont: "Inter",
  colors: ["#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9"],
  projects: [
    {
      id: "p1",
      name: "WebUI Design",
      description: "You need to develop an application on something like React native, so that it is for Android and IOS. There are about 30 screens, the design and layout in the sketch is ready.",
      clientName: "Dropbox, Inc.",
      projectType: "Mobile App",
      industry: "Technology",
      deliverable: "Mobile Application (iOS & Android)",
      scopeDescription: "Full project scope - 30 screens",
      startDate: "2024-06-17",
      endDate: "2024-07-04",
      endTime: "18:00",
      deliverableStages: [
        { id: "1", stage: "Stage 1", description: "Research & Discovery", date: "2024-06-20" },
        { id: "2", stage: "Stage 2", description: "Wireframes & Prototypes", date: "2024-06-25" },
        { id: "3", stage: "Stage 3", description: "UI Design Development", date: "2024-06-30" },
        { id: "4", stage: "Stage 4", description: "Final Delivery", date: "2024-07-04" },
      ],
      accountManager: "John Doe",
      autoDeleteIteration: "30 Days",
      needQCTool: true,
      workmode: "creative",
      team: [
        { id: "1", name: "Jacob Hawkins", role: "Project Manager", avatar: "https://i.pravatar.cc/150?img=1" },
        { id: "2", name: "Regina Cooper", role: "Lead Designer", avatar: "https://i.pravatar.cc/150?img=2" },
        { id: "3", name: "Jane Wilson", role: "UI Designer", avatar: "https://i.pravatar.cc/150?img=3" },
        { id: "4", name: "Ronald Robertson", role: "Reviewer", avatar: "https://i.pravatar.cc/150?img=4" },
        { id: "5", name: "Dustin Williamson", role: "Developer", avatar: "https://i.pravatar.cc/150?img=5" },
        { id: "6", name: "Robert Edwards", role: "QC Analyst", avatar: "https://i.pravatar.cc/150?img=6" },
      ],
      references: [
        { id: "1", name: "Wireframe UI Kit.zip", size: "5.8 MB" },
        { id: "2", name: "Brand Styles Guide.pdf", size: "487KB" },
        { id: "3", name: "Rocket – Admin Dashboard UI Kit", size: "5.8 MB" },
      ],
      externalLinks: [
        { id: "1", name: "Figma Design File", url: "https://figma.com/file/xxx" },
        { id: "2", name: "Notion Brief Document", url: "https://notion.so/xxx" },
      ],
      namingColumns: [
        { id: "1", value: "Brand Name" },
        { id: "2", value: "Project Name" },
        { id: "3", value: "Date" },
        { id: "4", value: "Version" },
      ],
      otherDescription: "The storage and processing server is on our side. Please ensure all deliverables follow the brand guidelines provided.",
      createdOn: "10 June",
      deadline: "04 Jul, 2024",
      daysLeft: 7,
      status: "brief_received",
      additionalMembers: 0,
      budget: "2,08,000",
      creatives: [
        { id: "c1", name: "Hero Banner v2", type: "Image", thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop", iterations: 3, activeFeedbacks: 2, status: "in_review", lastUpdated: "2 hours ago", dimensions: "1920x1080" },
        { id: "c2", name: "Instagram Story", type: "Image", thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=200&fit=crop", iterations: 2, activeFeedbacks: 0, status: "approved", lastUpdated: "1 day ago", dimensions: "1080x1920" },
        { id: "c3", name: "Product Showcase", type: "Video", thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=300&h=200&fit=crop", iterations: 1, activeFeedbacks: 5, status: "revision", lastUpdated: "3 hours ago", dimensions: "1920x1080" },
        { id: "c4", name: "Landing Page Header", type: "Website", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop", iterations: 4, activeFeedbacks: 1, status: "pending", lastUpdated: "5 hours ago", dimensions: "1440x900" },
      ],
    },
    {
      id: "p2",
      name: "Dashboard Redesign",
      description: "Complete redesign of the analytics dashboard with modern UI patterns.",
      clientName: "Dropbox, Inc.",
      projectType: "Web Development",
      industry: "Technology",
      deliverable: "Dashboard UI",
      scopeDescription: "5 dashboard screens",
      startDate: "2024-07-05",
      endDate: "2024-07-20",
      accountManager: "Jane Smith",
      autoDeleteIteration: "14 Days",
      needQCTool: true,
      workmode: "productive",
      team: [
        { id: "1", name: "John Lee", role: "Project Manager", avatar: "https://i.pravatar.cc/150?img=7" },
        { id: "2", name: "Lisa Park", role: "Designer", avatar: "https://i.pravatar.cc/150?img=8" },
      ],
      references: [{ id: "1", name: "Current Site Analysis.pdf", size: "2.1 MB" }],
      createdOn: "5 July",
      deadline: "20 July",
      daysLeft: 7,
      status: "qc_pending",
      additionalMembers: 2,
      budget: "1,50,000",
    },
    {
      id: "p3",
      name: "Landing Page",
      description: "Create a high-converting landing page for product launch.",
      clientName: "Dropbox, Inc.",
      projectType: "Web Design",
      industry: "Technology",
      deliverable: "Landing Page",
      scopeDescription: "Single page with 3 variants",
      startDate: "2024-07-01",
      endDate: "2024-07-20",
      accountManager: "Mike Johnson",
      workmode: "creative",
      team: [
        { id: "1", name: "Tom Hardy", role: "Developer", avatar: "https://i.pravatar.cc/150?img=9" },
        { id: "2", name: "Amy Liu", role: "Designer", avatar: "https://i.pravatar.cc/150?img=10" },
      ],
      references: [{ id: "1", name: "Brand Guidelines.pdf", size: "3.2 MB" }],
      createdOn: "1 July",
      deadline: "20 July",
      daysLeft: 7,
      status: "iteration_shared",
      additionalMembers: 0,
      budget: "79,000",
    },
    {
      id: "p4",
      name: "Mobile App UI",
      description: "Mobile app interface design for iOS and Android.",
      clientName: "Dropbox, Inc.",
      projectType: "Mobile Design",
      industry: "Technology",
      deliverable: "App Screens",
      startDate: "2024-07-08",
      endDate: "2024-07-15",
      accountManager: "Sarah Williams",
      workmode: "productive",
      team: [
        { id: "1", name: "Ryan Gosling", role: "Lead Designer", avatar: "https://i.pravatar.cc/150?img=11" },
        { id: "2", name: "Olivia Wilde", role: "Reviewer", avatar: "https://i.pravatar.cc/150?img=12" },
      ],
      createdOn: "8 July",
      deadline: "15 July",
      daysLeft: 5,
      status: "feedback_received",
      additionalMembers: 0,
      budget: "1,00,000",
    },
  ],
  completedProjects: [],
}

// Mode Badge Component
function ModeBadge({ mode }: { mode?: "productive" | "creative" }) {
  if (mode === "creative") {
    return (
      <span className="relative inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full overflow-hidden">
        <span className="absolute inset-0 bg-gradient-to-r from-[#5C6ECD] via-[#8B5CF6] to-[#5C6ECD] animate-gradient-x" />
        <span className="relative flex items-center gap-1 text-white">
          <Sparkles className="w-3 h-3" />
          Creative
        </span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
      <Zap className="w-3 h-3" />
      Productive
    </span>
  )
}

// Project Card Component
function ProjectCard({ project, isSelected, onClick, clientLogo }: { project: Project; isSelected: boolean; onClick: () => void; clientLogo?: string }) {
  const status = statusConfig[project.status]
  const StatusIcon = status.icon

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all rounded-xl border",
        isSelected ? "bg-[#5C6ECD]/5 border-[#5C6ECD] shadow-sm" : "border-border hover:border-[#5C6ECD]/50 hover:bg-muted/30"
      )}
    >
      {/* Top Row - Status & Mode */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full",
          status.tagBg
        )}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
        <ModeBadge mode={project.workmode} />
      </div>

      {/* Project Info */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {clientLogo ? (
            <img src={clientLogo} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Briefcase className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm truncate leading-tight">{project.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{project.projectType}</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Budget</p>
          <p className="text-xs font-semibold text-foreground">₹{project.budget || "N/A"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Deadline</p>
          <p className="text-xs font-semibold text-foreground">{formatDate(project.endDate) || "TBD"}</p>
        </div>
      </div>

      {/* Team & Days Row */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center -space-x-2">
          {project.team.slice(0, 3).map((member, index) => (
            <Avatar key={index} className="w-6 h-6 border-2 border-background">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="text-[8px] bg-[#5C6ECD] text-white">{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          {project.team.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-muted text-foreground text-[9px] font-bold flex items-center justify-center border-2 border-background">
              +{project.team.length - 3}
            </div>
          )}
        </div>
        <span className={cn(
          "text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1",
          project.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
          project.daysLeft <= 3 ? "bg-red-500/10 text-red-500" :
          project.daysLeft <= 5 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-foreground/60"
        )}>
          <Clock className="w-3 h-3" />
          {project.status === "completed" ? "Done" : `${project.daysLeft}d`}
        </span>
      </div>
    </div>
  )
}

// Filter Tags Component - Horizontal scrollable with colored badges matching status dropdown
function FilterTags({ selectedFilter, onFilterChange, projectCounts }: { selectedFilter: StatusKey | "all"; onFilterChange: (filter: StatusKey | "all") => void; projectCounts: Record<string, number> }) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        <button
          onClick={() => onFilterChange("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
            selectedFilter === "all"
              ? "bg-[#5C6ECD] text-white border-[#5C6ECD]"
              : "bg-[#5C6ECD]/10 text-[#5C6ECD] border-[#5C6ECD]/20 hover:bg-[#5C6ECD]/20"
          )}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          All
          <span className="opacity-80">({projectCounts.all || 0})</span>
        </button>
        {statusList.map((statusKey) => {
          const config = statusConfig[statusKey]
          const StatusIcon = config.icon
          const count = projectCounts[statusKey] || 0
          if (count === 0) return null
          return (
            <button
              key={statusKey}
              onClick={() => onFilterChange(statusKey)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                selectedFilter === statusKey
                  ? config.bgColor + " text-white border-transparent"
                  : config.tagBg + " border-current/20 hover:opacity-80"
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label.split(" ")[0]}
              <span className="opacity-80">({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Section Header Component
function SectionHeader({ icon: Icon, title, action }: { icon: typeof FileText; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#5C6ECD]" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  )
}

// Assets Drawer Component
function AssetsDrawer({ open, onOpenChange, client }: { open: boolean; onOpenChange: (open: boolean) => void; client: ClientRoom }) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const copyColor = (color: string) => { navigator.clipboard.writeText(color); setCopiedColor(color); setTimeout(() => setCopiedColor(null), 2000) }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-[#5C6ECD]" /> Brand Assets</SheetTitle>
          <SheetDescription>Manage your brand colors, fonts, and assets</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[#5C6ECD]" /> Logo</h3>
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                {client.logoUrl ? <img src={client.logoUrl} alt="Logo" className="h-16 object-contain" /> : <div className="w-20 h-20 rounded-xl bg-black flex items-center justify-center"><span className="text-white font-bold text-xl">{client.logo}</span></div>}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 gap-2"><Download className="w-4 h-4" /> Download Logo Pack</Button>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-[#5C6ECD]" /> Color Palette</h3>
              <div className="grid grid-cols-3 gap-2">
                {client.colors.map((color, index) => (
                  <button key={index} onClick={() => copyColor(color)} className="group relative aspect-square rounded-xl border border-border overflow-hidden hover:scale-105 transition-transform">
                    <div className="w-full h-full" style={{ backgroundColor: color }} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"><Copy className="w-4 h-4 text-white" /></div>
                    {copiedColor === color && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="text-white text-xs font-medium">Copied!</span></div>}
                    <div className="absolute bottom-1 left-1 right-1"><span className="text-[9px] font-mono bg-black/50 text-white px-1 py-0.5 rounded">{color}</span></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Type className="w-4 h-4 text-[#5C6ECD]" /> Typography</h3>
              <div className="space-y-2">
                {[{ label: "Primary", value: client.primaryFont }, { label: "Secondary", value: client.secondaryFont }, { label: "Tertiary", value: client.tertiaryFont }].map((font) => (
                  <div key={font.label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div><span className="text-xs text-muted-foreground">{font.label}</span><p className="font-semibold text-foreground">{font.value}</p></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Team Members Modal
function TeamMembersModal({ open, onOpenChange, team, projectName }: { open: boolean; onOpenChange: (open: boolean) => void; team: TeamMember[]; projectName: string }) {
  const roleColors: Record<string, string> = {
    "Project Manager": "bg-[#5C6ECD]",
    "Lead Designer": "bg-[#5C6ECD]",
    "Designer": "bg-slate-700",
    "UI Designer": "bg-slate-700",
    "Developer": "bg-emerald-600",
    "Reviewer": "bg-slate-600",
    "QC Analyst": "bg-slate-600",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5C6ECD]" />
            Team Members
          </DialogTitle>
          <DialogDescription>{projectName} - {team.length} members</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {team.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-[#5C6ECD] text-white">{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{member.name}</p>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", roleColors[member.role] || "bg-gray-500")} />
                  <span className="text-sm text-muted-foreground">{member.role}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4 gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8]">
          <UserPlus className="w-4 h-4" /> Add Team Member
        </Button>
      </DialogContent>
    </Dialog>
  )
}

interface RoomContentProps { clientId?: string }

export function RoomContent({ clientId }: RoomContentProps) {
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [assetsDrawerOpen, setAssetsDrawerOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all")
  const [activeTab, setActiveTab] = useState<"details" | "creatives">("details")
  const client = sampleClientRoom

  const projectCounts = client.projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; acc.all = (acc.all || 0) + 1; return acc }, {} as Record<string, number>)
  const filteredProjects = client.projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  useEffect(() => { const timer = setTimeout(() => { setIsLoading(false); if (client.projects.length > 0) setSelectedProject(client.projects[0]) }, 500); return () => clearTimeout(timer) }, [])

  const handleProjectSelect = (project: Project) => { setSelectedProject(project); setActiveTab("details") }
  const handleCreativeReview = (creativeId: string) => { if (selectedProject) router.push(`/communication?projectId=${selectedProject.id}&creativeId=${creativeId}`) }
  const handleStatusChange = (newStatus: StatusKey) => { if (selectedProject) setSelectedProject({ ...selectedProject, status: newStatus }); setStatusDropdownOpen(false) }
  const formatDate = (dateStr?: string) => { if (!dateStr) return ""; const date = new Date(dateStr); return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }

  if (isLoading) return <main className="flex-1 overflow-hidden bg-background"><div className="h-full flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div></main>

  const currentStatus = selectedProject ? statusConfig[selectedProject.status] : null

  return (
    <main className="flex-1 overflow-hidden bg-background flex flex-col">
      {/* Fixed Top Bar - Full Width with branded gradient */}
      <div className="h-16 border-b border-[#5C6ECD]/20 bg-gradient-to-r from-[#5C6ECD]/5 via-[#8B5CF6]/5 to-[#5C6ECD]/5 flex items-center justify-between px-5 flex-shrink-0">
        {/* Left Side - Logo, Company, Project Name */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full border border-[#5C6ECD]/20 bg-white/80 flex items-center justify-center hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all">
            <ArrowLeft className="w-4 h-4 text-[#5C6ECD]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-sm border border-[#5C6ECD]/10 flex items-center justify-center p-1.5">
              {client.logoUrl ? <img src={client.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="font-bold text-[#5C6ECD]">{client.logo}</span>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-foreground text-lg">{client.name}</h1>
                {selectedProject && (
                  <>
                    <span className="text-[#5C6ECD]/30">•</span>
                    <span className="text-[#5C6ECD] font-semibold">{selectedProject.name}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{client.projects.length} active projects</p>
            </div>
          </div>
        </div>

        {/* Right Side - Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssetsDrawerOpen(true)}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#5C6ECD]/20 bg-white/80 hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-[#5C6ECD]" />
            <span className="text-sm font-medium text-foreground">Brand Assets</span>
          </button>
          <button
            className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#5C6ECD]/20 bg-white/80 hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all"
          >
            <Settings className="w-4 h-4 text-[#5C6ECD] group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium text-foreground">Edit Client</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Action Bar - Aligned across all panels */}
        <div className="h-14 border-b border-border bg-card flex items-center flex-shrink-0">
          {/* Left Section - Search & Filters */}
          <div className="w-[320px] min-w-[320px] px-3 flex items-center gap-3 border-r border-border h-full">
            <div className="relative flex-shrink-0 w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 bg-muted/50 border-0 rounded-lg text-xs" />
            </div>
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <FilterTags selectedFilter={statusFilter} onFilterChange={setStatusFilter} projectCounts={projectCounts} />
            </div>
          </div>

          {/* Center Section - Tabs & Status */}
          {selectedProject && currentStatus && (
            <div className="flex-1 px-4 flex items-center justify-between h-full border-r border-border">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                <button
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === "details" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab("creatives")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === "creatives" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Creatives
                  {selectedProject.creatives && selectedProject.creatives.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#5C6ECD] text-white">
                      {selectedProject.creatives.length}
                    </span>
                  )}
                </button>
              </div>
              {/* Status Change Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                    currentStatus.bgColor, "text-white border-transparent hover:opacity-90"
                  )}
                >
                  <currentStatus.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{currentStatus.label}</span>
                  {statusDropdownOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Status</div>
                    {statusList.map((statusKey) => {
                      const config = statusConfig[statusKey]
                      const StatusIcon = config.icon
                      const isSelected = selectedProject.status === statusKey
                      return (
                        <button
                          key={statusKey}
                          onClick={() => handleStatusChange(statusKey)}
                          className={cn("w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors", isSelected ? "bg-muted" : "hover:bg-muted/50")}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.iconBg)}>
                              <StatusIcon className={cn("w-4 h-4", config.color)} />
                            </div>
                            <span className={cn("font-medium", isSelected ? config.color : "text-foreground")}>{config.label}</span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-[#5C6ECD]" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Section - Team */}
          {selectedProject && (
            <div className="w-[280px] min-w-[280px] px-4 flex items-center justify-between h-full">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Team</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-2">
                  {selectedProject.team.slice(0, 4).map((member) => (
                    <Avatar key={member.id} className="w-7 h-7 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110" onClick={() => setTeamModalOpen(true)}>
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-[#5C6ECD] text-white text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {selectedProject.team.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-muted text-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background cursor-pointer" onClick={() => setTeamModalOpen(true)}>
                      +{selectedProject.team.length - 4}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTeamModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Projects List */}
          <div className="w-[320px] min-w-[320px] border-r border-border flex flex-col bg-card h-full">
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-3">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={selectedProject?.id === project.id}
                    onClick={() => handleProjectSelect(project)}
                    clientLogo={client.logoUrl}
                  />
                ))}
                {filteredProjects.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No projects found</div>}
              </div>
            </div>
          </div>

          {/* Center Panel - Project Details */}
          {selectedProject && currentStatus && (
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-muted/30">

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "details" ? (
                <div className="p-6 space-y-6">
                  {/* Brand Information */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <SectionHeader icon={Building2} title="Brand Information" action={<Button variant="ghost" size="sm" className="gap-1.5 text-[#5C6ECD]"><Edit3 className="w-3.5 h-3.5" /> Edit</Button>} />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div><p className="text-xs text-muted-foreground">Project Name</p><p className="text-sm font-medium text-foreground">{selectedProject.name}</p></div>
                      <div><p className="text-xs text-muted-foreground">Project Type</p><p className="text-sm font-medium text-foreground">{selectedProject.projectType}</p></div>
                      <div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium text-foreground">{selectedProject.industry || "N/A"}</p></div>
                      {selectedProject.budget && <div><p className="text-xs text-muted-foreground">Budget</p><p className="text-sm font-medium text-foreground">₹{selectedProject.budget}</p></div>}
                    </div>
                    {selectedProject.description && <div className="mt-4 pt-4 border-t border-border"><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground leading-relaxed">{selectedProject.description}</p></div>}
                  </div>

                  {/* Project Scope */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <SectionHeader icon={Target} title="Project Scope & Objective" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {selectedProject.deliverable && <div><p className="text-xs text-muted-foreground">Deliverable</p><p className="text-sm font-medium text-foreground">{selectedProject.deliverable}</p></div>}
                      {selectedProject.scopeDescription && <div><p className="text-xs text-muted-foreground">Scope</p><p className="text-sm font-medium text-foreground">{selectedProject.scopeDescription}</p></div>}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <SectionHeader icon={CalendarDays} title="Timeline & Milestones" />
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-[#5C6ECD]" /></div>
                        <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-semibold text-foreground text-sm">{formatDate(selectedProject.startDate)}</p></div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-orange-500" /></div>
                        <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-semibold text-foreground text-sm">{formatDate(selectedProject.endDate)}</p></div>
                      </div>
                      {selectedProject.endTime && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-slate-500" /></div>
                          <div><p className="text-xs text-muted-foreground">End Time</p><p className="font-semibold text-foreground text-sm">{selectedProject.endTime}</p></div>
                        </div>
                      )}
                    </div>
                    {selectedProject.deliverableStages && selectedProject.deliverableStages.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-3">DELIVERABLE STAGES</p>
                        <div className="space-y-2">
                          {selectedProject.deliverableStages.map((stage) => (
                            <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                              <div className="px-3 py-1.5 rounded-full bg-[#5C6ECD] text-white text-xs font-bold">{stage.stage}</div>
                              <div className="flex-1"><p className="text-sm font-medium text-foreground">{stage.description}</p></div>
                              <div className="text-sm text-muted-foreground">{formatDate(stage.date)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Creatives Tab - List View */
                <div className="p-6">
                  <div className="space-y-3">
                    {selectedProject.creatives && selectedProject.creatives.length > 0 ? (
                      selectedProject.creatives.map((creative) => {
                        const creativeStatusConfig: Record<string, { label: string; icon: typeof Eye; bg: string; text: string; iconBg: string }> = {
                          in_review: { label: "In Review", icon: Eye, bg: "bg-amber-500/10", text: "text-amber-600", iconBg: "bg-amber-500/10" },
                          approved: { label: "Approved", icon: CheckCircle, bg: "bg-emerald-500/10", text: "text-emerald-600", iconBg: "bg-emerald-500/10" },
                          pending: { label: "Pending", icon: Clock, bg: "bg-slate-500/10", text: "text-slate-600", iconBg: "bg-slate-500/10" },
                          revision: { label: "Revision", icon: AlertCircle, bg: "bg-red-500/10", text: "text-red-600", iconBg: "bg-red-500/10" },
                        }
                        const typeColors: Record<string, { bg: string; text: string }> = {
                          "Image": { bg: "bg-blue-500/10", text: "text-blue-600" },
                          "Video": { bg: "bg-purple-500/10", text: "text-purple-600" },
                          "Document": { bg: "bg-orange-500/10", text: "text-orange-600" },
                          "Website": { bg: "bg-cyan-500/10", text: "text-cyan-600" },
                        }
                        const statusInfo = creativeStatusConfig[creative.status]
                        const StatusIcon = statusInfo.icon
                        return (
                          <div key={creative.id} className="bg-card rounded-xl border border-border p-4 hover:border-[#5C6ECD]/50 transition-all group">
                            <div className="flex items-center gap-4">
                              {/* Thumbnail */}
                              <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                <img src={creative.thumbnail} alt={creative.name} className="w-full h-full object-cover" />
                                {creative.type === "Video" && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Play className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground text-sm truncate">{creative.name}</h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{creative.dimensions}</span>
                                  <span>•</span>
                                  <span>{creative.lastUpdated}</span>
                                </div>
                              </div>

                              {/* Type Badge */}
                              <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0", typeColors[creative.type]?.bg || "bg-slate-500/10", typeColors[creative.type]?.text || "text-slate-600")}>
                                {creative.type}
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-center">
                                  <p className="text-sm font-bold text-foreground">{creative.iterations}</p>
                                  <p className="text-[10px] text-muted-foreground">Iterations</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-foreground">{creative.activeFeedbacks}</p>
                                  <p className="text-[10px] text-muted-foreground">Feedbacks</p>
                                </div>
                              </div>

                              {/* Status Badge - Matching dropdown style */}
                              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0", statusInfo.bg, statusInfo.text)}>
                                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", statusInfo.iconBg)}>
                                  <StatusIcon className="w-3.5 h-3.5" />
                                </div>
                                {statusInfo.label}
                              </div>

                              {/* Review Button */}
                              <Button
                                onClick={() => handleCreativeReview(creative.id)}
                                size="sm"
                                className="gap-1.5 bg-foreground hover:bg-foreground/90 text-background h-8 px-3 rounded-lg flex-shrink-0"
                              >
                                <ScanSearch className="w-3.5 h-3.5" />
                                Enter Review
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-12 text-center text-muted-foreground">
                        <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No creatives uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel - Resources */}
        {selectedProject && (
          <div className="w-[280px] min-w-[280px] border-l border-border flex flex-col bg-card">
            <ScrollArea className="flex-1">
              {/* References Section */}
              {selectedProject.references && selectedProject.references.length > 0 && (
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-3">
                    <FolderOpen className="w-4 h-4 text-[#5C6ECD]" />
                    References
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.references.map((ref, index) => (
                      <div key={ref.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                        <div className="w-6 h-6 rounded bg-foreground text-background flex items-center justify-center text-[10px] font-bold flex-shrink-0">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{ref.name}</p>
                          {ref.size && <p className="text-[10px] text-muted-foreground">{ref.size}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links Section */}
              {selectedProject.externalLinks && selectedProject.externalLinks.length > 0 && (
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-3">
                    <Link className="w-4 h-4 text-[#5C6ECD]" />
                    External Links
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.externalLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-[#5C6ECD]/30 transition-colors group"
                      >
                        <div className="w-6 h-6 rounded bg-[#5C6ECD]/10 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-3 h-3 text-[#5C6ECD]" />
                        </div>
                        <span className="text-xs font-medium text-foreground truncate flex-1">{link.name}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Quick Stats - Fixed at Bottom */}
            <div className="p-4 border-t border-border space-y-3 flex-shrink-0 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Days Left</span>
                <span className={cn("font-bold", selectedProject.daysLeft <= 3 ? "text-red-500" : selectedProject.daysLeft <= 5 ? "text-orange-500" : "text-foreground")}>
                  {selectedProject.daysLeft} days
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-bold text-foreground">₹{selectedProject.budget}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <ModeBadge mode={selectedProject.workmode} />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <AssetsDrawer open={assetsDrawerOpen} onOpenChange={setAssetsDrawerOpen} client={client} />
      {selectedProject && <TeamMembersModal open={teamModalOpen} onOpenChange={setTeamModalOpen} team={selectedProject.team} projectName={selectedProject.name} />}

      {/* Add gradient animation keyframes and scrollbar hide */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 2s ease infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  )
}
