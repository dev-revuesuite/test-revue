"use client"

import { useState } from "react"
import {
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
} from "lucide-react"
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

type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

export interface ProjectDetails {
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
  // Project Scope
  industry?: string
  deliverable?: string
  scopeDescription?: string
  // Timeline
  startDate?: string
  endDate?: string
  endTime?: string
  deliverableStages?: DeliverableStage[]
  // Team
  accountManager?: string
  accountManagerAvatar?: string
  team: TeamMember[]
  additionalMembers: number
  autoDeleteIteration?: string
  needQCTool?: boolean
  // Resources
  references?: Reference[]
  externalLinks?: ExternalLinkItem[]
  namingConvention?: string
  otherDescription?: string
  // Assets (from client)
  colors?: string[]
  primaryFont?: string
  secondaryFont?: string
  tertiaryFont?: string
  completedOn?: string
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

interface ProjectDetailsModalProps {
  project: ProjectDetails | null
  open: boolean
  onClose: () => void
}

export function ProjectDetailsModal({ project, open, onClose }: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "team" | "resources">("overview")
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  if (!open || !project) return null

  const status = statusConfig[project.status]
  const StatusIcon = status.icon

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedColor(text)
    setTimeout(() => setCopiedColor(null), 2000)
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Briefcase },
    { id: "timeline", label: "Timeline", icon: Calendar },
    { id: "team", label: "Team", icon: Users },
    { id: "resources", label: "Resources", icon: FileText },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90vw] max-w-4xl max-h-[85vh] bg-white dark:bg-[#1a1a1a] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="px-6 py-4 border-b border-gray-200 dark:border-[#333] shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-foreground truncate">{project.name}</h1>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white", status.bgColor)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  {project.clientName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  {project.projectType}
                </span>
                {project.projectMode === "Creative Mode" ? (
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
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-4 pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2",
                  activeTab === tab.id
                    ? "border-[#5C6ECD] text-[#5C6ECD]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Description */}
              {project.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Created</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{project.createdOn}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Deadline</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{project.deadline}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs">Days Left</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{project.status === "completed" ? "Completed" : `${project.daysLeft} days`}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Team Size</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{project.team.length + project.additionalMembers} members</p>
                </div>
              </div>

              {/* Project Scope */}
              {(project.industry || project.deliverable || project.scopeDescription) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#5C6ECD]" />
                    Project Scope
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {project.industry && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Industry</span>
                        <p className="text-sm font-medium text-foreground mt-1">{project.industry}</p>
                      </div>
                    )}
                    {project.deliverable && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Deliverable</span>
                        <p className="text-sm font-medium text-foreground mt-1">{project.deliverable}</p>
                      </div>
                    )}
                    {project.scopeDescription && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Scope</span>
                        <p className="text-sm font-medium text-foreground mt-1">{project.scopeDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assets */}
              {(project.colors?.length || project.primaryFont) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#5C6ECD]" />
                    Brand Assets
                  </h3>

                  {/* Fonts */}
                  {(project.primaryFont || project.secondaryFont || project.tertiaryFont) && (
                    <div className="flex flex-wrap gap-4 mb-4">
                      {project.primaryFont && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground">Primary:</span>
                          <span className="text-sm font-semibold text-foreground">{project.primaryFont}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      )}
                      {project.secondaryFont && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground">Secondary:</span>
                          <span className="text-sm font-semibold text-foreground">{project.secondaryFont}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      )}
                      {project.tertiaryFont && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground">Tertiary:</span>
                          <span className="text-sm font-semibold text-foreground">{project.tertiaryFont}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Colors */}
                  {project.colors && project.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.colors.map((color, index) => (
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
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#5C6ECD]" />
                  Project Settings
                </h3>
                <div className="flex flex-wrap gap-3">
                  {project.autoDeleteIteration && (
                    <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
                      <span className="text-muted-foreground">Auto-delete iterations: </span>
                      <span className="font-medium text-foreground">{project.autoDeleteIteration}</span>
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
                    <span className="text-muted-foreground">QC Tool: </span>
                    <span className={cn("font-medium", project.needQCTool ? "text-green-600" : "text-muted-foreground")}>
                      {project.needQCTool ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#5C6ECD]/10 border border-[#5C6ECD]/20">
                  <div className="flex items-center gap-2 text-[#5C6ECD] mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Start Date</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{project.startDate || project.createdOn}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">End Date</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{project.endDate || project.deadline}</p>
                </div>
                {project.endTime && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">End Time</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{project.endTime}</p>
                  </div>
                )}
              </div>

              {/* Deliverable Stages */}
              {project.deliverableStages && project.deliverableStages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Deliverable Milestones</h3>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-border" />

                    <div className="space-y-4">
                      {project.deliverableStages.map((stage, index) => (
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
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {/* Account Manager */}
              {project.accountManager && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Account Manager</h3>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#5C6ECD]/10 border border-[#5C6ECD]/20">
                    <Avatar className="w-12 h-12 border-2 border-[#5C6ECD]">
                      <AvatarImage src={project.accountManagerAvatar} />
                      <AvatarFallback className="bg-[#5C6ECD] text-white text-lg">
                        {project.accountManager.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{project.accountManager}</p>
                      <p className="text-sm text-muted-foreground">Project Lead</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Team Members ({project.team.length + project.additionalMembers})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.team.map((member) => (
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
                  {project.additionalMembers > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border border-dashed">
                      <div className="w-10 h-10 rounded-full bg-[#DBFE52] text-black flex items-center justify-center text-sm font-bold">
                        +{project.additionalMembers}
                      </div>
                      <p className="text-sm text-muted-foreground">additional members</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === "resources" && (
            <div className="space-y-6">
              {/* References */}
              {project.references && project.references.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#5C6ECD]" />
                    References
                  </h3>
                  <div className="space-y-2">
                    {project.references.map((ref, index) => (
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
              {project.externalLinks && project.externalLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#5C6ECD]" />
                    External Links
                  </h3>
                  <div className="space-y-2">
                    {project.externalLinks.map((link, index) => (
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
              {project.namingConvention && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Naming Convention</h3>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <code className="text-sm font-mono text-[#5C6ECD]">{project.namingConvention}</code>
                  </div>
                </div>
              )}

              {/* Other Description */}
              {project.otherDescription && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Additional Notes</h3>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">{project.otherDescription}</p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!project.references?.length && !project.externalLinks?.length && !project.namingConvention && !project.otherDescription && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No resources added yet</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
