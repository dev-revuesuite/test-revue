"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Calendar,
  Clock,
  Users,
  FileText,
  Link as LinkIcon,
  Briefcase,
  Target,
  Layers,
  CheckCircle,
  AlertCircle,
  Eye,
  Share,
  Info,
  Sparkles,
  Zap,
  Download,
  ExternalLink,
  Copy,
  Plus,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
}

interface ExternalLinkItem {
  id: string
  name: string
  url?: string
}

interface Creative {
  id: string
  version: number
  name: string
  timestamp: string
  imageUrl: string
  feedbackCount: number
  unresolvedCount: number
}

type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

interface BriefData {
  id: string
  name: string
  description?: string
  clientName: string
  projectType: string
  createdOn: string
  deadline: string
  daysLeft: number
  status: StatusKey
  projectMode: "Creative Mode" | "Productive Mode"
  industry?: string
  deliverable?: string
  scopeDescription?: string
  startDate?: string
  endDate?: string
  endTime?: string
  deliverableStages?: DeliverableStage[]
  accountManager?: string
  accountManagerAvatar?: string
  team: TeamMember[]
  additionalMembers: number
  autoDeleteIteration?: string
  needQCTool?: boolean
  references?: Reference[]
  externalLinks?: ExternalLinkItem[]
  namingConvention?: string
  otherDescription?: string
  colors?: string[]
  primaryFont?: string
  secondaryFont?: string
  tertiaryFont?: string
  creatives?: Creative[]
}

const statusConfig: Record<StatusKey, { label: string; icon: typeof FileText; color: string; bgColor: string }> = {
  brief_received: { label: "Brief Received", icon: FileText, color: "text-[#5C6ECD]", bgColor: "bg-[#5C6ECD]" },
  qc_pending: { label: "QC Pending", icon: AlertCircle, color: "text-amber-500", bgColor: "bg-amber-500" },
  review_qc: { label: "Review QC", icon: Eye, color: "text-gray-500", bgColor: "bg-gray-500" },
  iteration_shared: { label: "Iteration Shared", icon: Share, color: "text-blue-500", bgColor: "bg-blue-500" },
  feedback_received: { label: "Feedback Received", icon: Info, color: "text-orange-500", bgColor: "bg-orange-500" },
  iteration_approved: { label: "Iteration Approved", icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500" },
}

// Sample data - in production this would come from API
const sampleBriefData: Record<string, BriefData> = {
  "p1": {
    id: "p1",
    name: "Revitalise Brand Identity",
    description: "Complete brand refresh including logo redesign, color palette update, and brand guidelines documentation for TechVision Labs.",
    clientName: "TechVision Labs",
    projectType: "Branding",
    createdOn: "10 July",
    deadline: "20 July",
    daysLeft: 10,
    status: "brief_received",
    projectMode: "Creative Mode",
    industry: "Technology",
    deliverable: "Brand Identity Package",
    scopeDescription: "Full project scope",
    startDate: "2024-07-10",
    endDate: "2024-07-20",
    endTime: "18:00",
    deliverableStages: [
      { id: "1", stage: "Stage 1", description: "Research & Discovery", date: "2024-07-12" },
      { id: "2", stage: "Stage 2", description: "Concept Development", date: "2024-07-15" },
      { id: "3", stage: "Stage 3", description: "Final Delivery", date: "2024-07-20" },
    ],
    accountManager: "John Doe",
    accountManagerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    team: [
      { id: "1", name: "Alex Turner", role: "Lead Designer", avatar: "https://i.pravatar.cc/150?img=1" },
      { id: "2", name: "Sarah Chen", role: "Brand Strategist", avatar: "https://i.pravatar.cc/150?img=2" },
      { id: "3", name: "Mike Ross", role: "Graphic Designer", avatar: "https://i.pravatar.cc/150?img=3" },
      { id: "4", name: "Emma Wilson", role: "Project Coordinator", avatar: "https://i.pravatar.cc/150?img=4" },
    ],
    additionalMembers: 2,
    autoDeleteIteration: "30 Days",
    needQCTool: true,
    references: [
      { id: "1", name: "Brand Strategy Document" },
      { id: "2", name: "Competitor Analysis" },
    ],
    externalLinks: [
      { id: "1", name: "Figma Design File", url: "https://figma.com" },
      { id: "2", name: "Notion Brief", url: "https://notion.so" },
    ],
    namingConvention: "TechVision_BrandIdentity_Date_Version",
    colors: ["#0F172A", "#1E293B", "#334155", "#475569", "#64748B"],
    primaryFont: "Gilroy",
    secondaryFont: "IBM Flex Mono",
    creatives: [
      { id: "c1", version: 1, name: "Logo Concept A", timestamp: "2 hours ago", imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=300&fit=crop", feedbackCount: 5, unresolvedCount: 2 },
      { id: "c2", version: 2, name: "Logo Concept B", timestamp: "1 day ago", imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop", feedbackCount: 8, unresolvedCount: 0 },
      { id: "c3", version: 3, name: "Color Palette", timestamp: "3 days ago", imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=300&fit=crop", feedbackCount: 3, unresolvedCount: 1 },
    ],
  },
}

// Fill in remaining brief data for other IDs
for (let i = 2; i <= 6; i++) {
  sampleBriefData[`p${i}`] = {
    ...sampleBriefData["p1"],
    id: `p${i}`,
    name: `Project ${i}`,
    creatives: [
      { id: `c${i}1`, version: 1, name: "Initial Design", timestamp: "1 day ago", imageUrl: `https://images.unsplash.com/photo-162678577457${i}-4b799315345d?w=400&h=300&fit=crop`, feedbackCount: 3, unresolvedCount: 1 },
    ],
  }
}

interface BriefContentProps {
  briefId: string
}

export function BriefContent({ briefId }: BriefContentProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [briefData, setBriefData] = useState<BriefData | null>(null)
  const [editData, setEditData] = useState<BriefData | null>(null)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"overview" | "timeline" | "team" | "resources">("overview")

  useEffect(() => {
    // Simulate fetching data
    const timer = setTimeout(() => {
      const data = sampleBriefData[briefId] || sampleBriefData["p1"]
      setBriefData(data)
      setEditData(data)
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [briefId])

  const handleSave = () => {
    if (editData) {
      setBriefData(editData)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditData(briefData)
    setIsEditing(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedColor(text)
    setTimeout(() => setCopiedColor(null), 2000)
  }

  const handleCreativeClick = (creative: Creative) => {
    router.push(`/communication?briefId=${briefId}&iterationId=${creative.id}`)
  }

  if (isLoading || !briefData) {
    return (
      <main className="flex-1 overflow-auto bg-background p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </main>
    )
  }

  const status = statusConfig[briefData.status]
  const StatusIcon = status.icon
  const data = isEditing ? editData! : briefData

  const sections = [
    { id: "overview", label: "Overview", icon: Briefcase },
    { id: "timeline", label: "Timeline", icon: Calendar },
    { id: "team", label: "Team", icon: Users },
    { id: "resources", label: "Resources", icon: FileText },
  ] as const

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-4 lg:p-6 h-full flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white", status.bgColor)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  {data.clientName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  {data.projectType}
                </span>
                {data.projectMode === "Creative Mode" ? (
                  <span className="creative-mode-text font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Creative Mode
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Productive Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} className="gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} className="gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8]">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Edit Brief
              </Button>
            )}
          </div>
        </header>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px",
                activeSection === section.id
                  ? "border-[#5C6ECD] text-[#5C6ECD]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-auto">
          {/* Left Column - Brief Details */}
          <div className="lg:col-span-3 space-y-6 overflow-auto">
            {/* Overview Section */}
            {activeSection === "overview" && (
              <>
                {/* Description */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Description</h3>
                  {isEditing ? (
                    <Textarea
                      value={editData?.description || ""}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="min-h-[100px]"
                      placeholder="Enter project description..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.description || "No description provided"}</p>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Created</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{data.createdOn}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Deadline</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{data.deadline}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      <span className="text-xs">Days Left</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{data.status === "completed" ? "Completed" : `${data.daysLeft} days`}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Team Size</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{data.team.length + data.additionalMembers} members</p>
                  </div>
                </div>

                {/* Project Scope */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#5C6ECD]" />
                    Project Scope
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground">Industry</span>
                      {isEditing ? (
                        <Input
                          value={editData?.industry || ""}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, industry: e.target.value } : null)}
                          className="mt-1 h-8"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground mt-1">{data.industry || "Not specified"}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground">Deliverable</span>
                      {isEditing ? (
                        <Input
                          value={editData?.deliverable || ""}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, deliverable: e.target.value } : null)}
                          className="mt-1 h-8"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground mt-1">{data.deliverable || "Not specified"}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground">Scope</span>
                      {isEditing ? (
                        <Input
                          value={editData?.scopeDescription || ""}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, scopeDescription: e.target.value } : null)}
                          className="mt-1 h-8"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground mt-1">{data.scopeDescription || "Not specified"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brand Assets */}
                {(data.colors?.length || data.primaryFont) && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#5C6ECD]" />
                      Brand Assets
                    </h3>

                    {/* Fonts */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {data.primaryFont && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground">Primary:</span>
                          <span className="text-sm font-semibold text-foreground">{data.primaryFont}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      )}
                      {data.secondaryFont && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground">Secondary:</span>
                          <span className="text-sm font-semibold text-foreground">{data.secondaryFont}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Colors */}
                    {data.colors && data.colors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {data.colors.map((color, index) => (
                          <button
                            key={index}
                            onClick={() => copyToClipboard(color)}
                            className="group relative"
                            title={`Click to copy ${color}`}
                          >
                            <div
                              className="w-12 h-12 rounded-lg border border-border hover:scale-105 transition-transform cursor-pointer"
                              style={{ backgroundColor: color }}
                            />
                            {copiedColor === color && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap">
                                Copied!
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Copy className="w-4 h-4 text-white drop-shadow-lg" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#5C6ECD]" />
                    Project Settings
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {data.autoDeleteIteration && (
                      <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
                        <span className="text-muted-foreground">Auto-delete iterations: </span>
                        <span className="font-medium text-foreground">{data.autoDeleteIteration}</span>
                      </div>
                    )}
                    <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
                      <span className="text-muted-foreground">QC Tool: </span>
                      <span className={cn("font-medium", data.needQCTool ? "text-green-600" : "text-muted-foreground")}>
                        {data.needQCTool ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Timeline Section */}
            {activeSection === "timeline" && (
              <>
                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#5C6ECD]/10 border border-[#5C6ECD]/20">
                    <div className="flex items-center gap-2 text-[#5C6ECD] mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">Start Date</span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData?.startDate || ""}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                        className="h-10"
                      />
                    ) : (
                      <p className="text-lg font-bold text-foreground">{data.startDate || data.createdOn}</p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">End Date</span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData?.endDate || ""}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                        className="h-10"
                      />
                    ) : (
                      <p className="text-lg font-bold text-foreground">{data.endDate || data.deadline}</p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">End Time</span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={editData?.endTime || ""}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                        className="h-10"
                      />
                    ) : (
                      <p className="text-lg font-bold text-foreground">{data.endTime || "Not set"}</p>
                    )}
                  </div>
                </div>

                {/* Deliverable Stages */}
                {data.deliverableStages && data.deliverableStages.length > 0 && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Deliverable Milestones</h3>
                    <div className="relative">
                      <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {data.deliverableStages.map((stage, index) => (
                          <div key={stage.id} className="flex items-start gap-4 relative">
                            <div className="w-9 h-9 rounded-full bg-[#DBFE52] text-black flex items-center justify-center text-sm font-bold shrink-0 z-10">
                              {index + 1}
                            </div>
                            <div className="flex-1 p-4 rounded-xl bg-muted/30 border border-border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-foreground">{stage.stage}</span>
                                {stage.date && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {stage.date}
                                  </span>
                                )}
                              </div>
                              {stage.description && (
                                <p className="text-sm text-muted-foreground">{stage.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Team Section */}
            {activeSection === "team" && (
              <>
                {/* Account Manager */}
                {data.accountManager && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Account Manager</h3>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#5C6ECD]/10 border border-[#5C6ECD]/20">
                      <Avatar className="w-12 h-12 border-2 border-[#5C6ECD]">
                        <AvatarImage src={data.accountManagerAvatar} />
                        <AvatarFallback className="bg-[#5C6ECD] text-white text-lg">
                          {data.accountManager.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{data.accountManager}</p>
                        <p className="text-sm text-muted-foreground">Project Lead</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Team Members ({data.team.length + data.additionalMembers})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.team.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-[#5C6ECD] text-white">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                    {data.additionalMembers > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border border-dashed">
                        <div className="w-10 h-10 rounded-full bg-[#DBFE52] text-black flex items-center justify-center text-sm font-bold">
                          +{data.additionalMembers}
                        </div>
                        <p className="text-sm text-muted-foreground">additional members</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Resources Section */}
            {activeSection === "resources" && (
              <>
                {/* References */}
                {data.references && data.references.length > 0 && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#5C6ECD]" />
                      References
                    </h3>
                    <div className="space-y-2">
                      {data.references.map((ref, index) => (
                        <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                          <div className="w-8 h-8 rounded bg-[#5C6ECD] text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="flex-1 text-sm text-foreground">{ref.name}</span>
                          <button className="p-2 text-muted-foreground hover:text-[#5C6ECD] transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Links */}
                {data.externalLinks && data.externalLinks.length > 0 && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-[#5C6ECD]" />
                      External Links
                    </h3>
                    <div className="space-y-2">
                      {data.externalLinks.map((link, index) => (
                        <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer group">
                          <div className="w-8 h-8 rounded bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="flex-1 text-sm text-foreground group-hover:text-[#5C6ECD] transition-colors">{link.name}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#5C6ECD] transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Naming Convention */}
                {data.namingConvention && (
                  <div className="p-5 rounded-xl border border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Naming Convention</h3>
                    {isEditing ? (
                      <Input
                        value={editData?.namingConvention || ""}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, namingConvention: e.target.value } : null)}
                        className="font-mono"
                      />
                    ) : (
                      <div className="p-4 rounded-xl bg-muted/30 border border-border">
                        <code className="text-sm font-mono text-[#5C6ECD]">{data.namingConvention}</code>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Creatives */}
          <div className="lg:col-span-2">
            <div className="p-5 rounded-xl border border-border bg-card sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#5C6ECD]" />
                  Creatives
                  <span className="text-sm font-normal text-muted-foreground">({data.creatives?.length || 0})</span>
                </h3>
                <Button size="sm" className="gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8]">
                  <Plus className="w-4 h-4" />
                  Add Creative
                </Button>
              </div>

              {data.creatives && data.creatives.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {data.creatives.map((creative) => (
                    <div
                      key={creative.id}
                      onClick={() => handleCreativeClick(creative)}
                      className="rounded-lg border border-border overflow-hidden hover:border-[#5C6ECD]/50 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        <img
                          src={creative.imageUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Version Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-semibold rounded">
                          v{creative.version}
                        </div>
                        {/* Feedback Badge */}
                        {creative.unresolvedCount > 0 && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-semibold rounded">
                            <MessageSquare className="w-3 h-3" />
                            {creative.unresolvedCount}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3 bg-card">
                        <p className="text-sm font-medium text-foreground truncate">{creative.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{creative.timestamp}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {creative.feedbackCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No creatives added yet</p>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Upload First Creative
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
