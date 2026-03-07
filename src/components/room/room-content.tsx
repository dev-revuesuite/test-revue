"use client"

import { useState, useRef, useEffect } from "react"
import {
  Users, FileText, Clock, Download, ChevronDown, Eye, MessageSquare,
  Check, CheckCircle, ArrowLeft, Plus,
  Briefcase, Palette, Type, Image as ImageIcon,
  ExternalLink, Search,
  Sparkles, Zap, FolderOpen,
  X, UserPlus, Pencil, FolderKanban, CircleDot, Upload, CircleCheck,
  Settings, Layers, Link, Circle, CheckCircle2, Copy,
  FileImage, Video, FileCheck, Layers2, Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { NewClientOnboarding, type ClientFormData } from "@/components/studio/new-client-onboarding"

// Types
interface Deliverable {
  id: string
  name: string
  status: "pending" | "in_progress" | "completed"
  dueDate?: string
}

interface Creative {
  id: string
  name: string
  type: "image" | "video" | "document" | "design"
  thumbnailUrl: string
  updatedAt: string
  feedbackCount: number
  iteration: number
  status: "in_progress" | "completed"
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

type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

interface Project {
  id: string
  name: string
  type: string
  description: string
  clientName: string
  createdOn: string
  deadline: string
  daysLeft: number
  status: StatusKey
  workmode?: "productive" | "creative"
  team: TeamMember[]
  additionalMembers: number
  references?: Reference[]
  externalLinks?: ExternalLinkItem[]
  budget?: string
  deliverables: Deliverable[]
  creatives: Creative[]
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

const projectTypes = [
  "Branding", "Social Media", "Web Design", "Mobile App", "Print Design", "Motion Graphics", "Packaging", "Video Production", "Other",
]

const creativeTypeIcons: Record<Creative["type"], typeof ImageIcon> = {
  image: FileImage,
  video: Video,
  document: FileText,
  design: Palette,
}

// Data is now passed via props from the server component

// Mode Badge Component
function ModeBadge({ mode }: { mode?: "productive" | "creative" }) {
  if (mode === "creative") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold animate-shimmer bg-gradient-to-r from-[#5C6ECD] via-[#8B5CF6] via-[#EC4899] to-[#5C6ECD] bg-[length:200%_100%] bg-clip-text text-transparent">
        <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
        Creative
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all rounded-xl border",
        isSelected ? "bg-[#5C6ECD]/5 border-[#5C6ECD] shadow-sm" : "border-border hover:border-[#5C6ECD]/50 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn("flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full", status.tagBg)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
        <ModeBadge mode={project.workmode} />
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {clientLogo ? <img src={clientLogo} alt="Logo" className="w-full h-full object-contain p-1" /> : <Briefcase className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm truncate leading-tight">{project.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{project.type}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Budget</p>
          <p className="text-xs font-semibold text-foreground">₹{project.budget || "N/A"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Deadline</p>
          <p className="text-xs font-semibold text-foreground">{project.deadline}</p>
        </div>
      </div>
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

// Filter Tags Component
function FilterTags({ selectedFilter, onFilterChange, projectCounts }: { selectedFilter: StatusKey | "all"; onFilterChange: (filter: StatusKey | "all") => void; projectCounts: Record<string, number> }) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        <button
          onClick={() => onFilterChange("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
            selectedFilter === "all" ? "bg-[#5C6ECD] text-white border-[#5C6ECD]" : "bg-[#5C6ECD]/10 text-[#5C6ECD] border-[#5C6ECD]/20 hover:bg-[#5C6ECD]/20"
          )}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          All ({projectCounts.all || 0})
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
                selectedFilter === statusKey ? config.bgColor + " text-white border-transparent" : config.tagBg + " border-current/20 hover:opacity-80"
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label.split(" ")[0]} ({count})
            </button>
          )
        })}
      </div>
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
function TeamMembersModal({ open, onOpenChange, team, projectName, orgMembers, onToggleMember }: { open: boolean; onOpenChange: (open: boolean) => void; team: TeamMember[]; projectName: string; orgMembers: { id: string; name: string; email: string; avatar?: string }[]; onToggleMember: (member: { id: string; name: string; email: string; avatar?: string }) => void }) {
  const roleColors: Record<string, string> = {
    "Project Manager": "bg-[#5C6ECD]",
    "Lead Designer": "bg-[#5C6ECD]",
    "Designer": "bg-slate-700",
    "UI Designer": "bg-slate-700",
    "Developer": "bg-emerald-600",
    "Reviewer": "bg-slate-600",
  }

  const assignedIds = new Set(team.map(t => t.id))
  const assigned = orgMembers.filter(m => assignedIds.has(m.id))
  const available = orgMembers.filter(m => !assignedIds.has(m.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-[#5C6ECD]" /> Team Members</DialogTitle>
          <DialogDescription>{projectName} — Click to add or remove members</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {assigned.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Assigned ({assigned.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {assigned.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => onToggleMember(member)}
                    className="relative flex items-center gap-3 p-3 rounded-lg border-2 border-[#5C6ECD] bg-[#5C6ECD]/5 text-left transition-all hover:bg-[#5C6ECD]/10"
                  >
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#5C6ECD] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-[#5C6ECD] text-white text-xs">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {available.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Available ({available.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {available.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => onToggleMember(member)}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-[#5C6ECD]/40 hover:bg-muted/50"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface OrgMember {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

interface RoomContentProps {
  clientData: ClientRoom
  orgMembers?: OrgMember[]
  clientEditData?: Record<string, unknown>
  organizationId?: string | null
}

export function RoomContent({ clientData, orgMembers = [], clientEditData, organizationId }: RoomContentProps) {
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    clientData.projects.length > 0 ? clientData.projects[0] : null
  )
  const [isLoading] = useState(false)
  const [assetsDrawerOpen, setAssetsDrawerOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all")
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Project | null>(
    clientData.projects.length > 0 ? clientData.projects[0] : null
  )

  // Deliverable modal state
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false)
  const [newDeliverable, setNewDeliverable] = useState({ name: "", dueDate: "" })

  // Creative modal state
  const [addCreativeOpen, setAddCreativeOpen] = useState(false)
  const [newCreative, setNewCreative] = useState({ name: "", type: "design" as Creative["type"], file: null as File | null, filePreview: "" })
  const creativeFileInputRef = useRef<HTMLInputElement>(null)

  // Reference preview state
  const [previewRef, setPreviewRef] = useState<Reference | null>(null)

  // Add team member state
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false)
  const [newTeamMember, setNewTeamMember] = useState({ name: "", role: "Designer" })
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)

  // Edit Client state
  const [editClientOpen, setEditClientOpen] = useState(false)

  const client = clientData

  // Sync selectedProject when clientData.projects changes (e.g. after router.refresh())
  useEffect(() => {
    if (clientData.projects.length > 0 && !selectedProject) {
      setSelectedProject(clientData.projects[0])
      setEditData(clientData.projects[0])
    }
  }, [clientData.projects, selectedProject])

  const projectCounts = client.projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; acc.all = (acc.all || 0) + 1; return acc }, {} as Record<string, number>)
  const filteredProjects = client.projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setEditData(project)
    setIsEditing(false)
  }

  const supabase = createClient()

  const persistDeliverables = async (projectId: string, deliverables: Deliverable[]) => {
    await supabase.from("projects").update({ project_deliverables: deliverables }).eq("id", projectId)
  }

  const deriveBriefStatus = (creatives: Creative[]): StatusKey => {
    if (creatives.length === 0) return "brief_received"
    if (creatives.every((c) => c.status === "completed")) return "completed"
    if (creatives.some((c) => c.status === "completed")) return "feedback_received"
    return "qc_pending"
  }

  const recalculateBriefStatus = async (projectId: string, creatives: Creative[]) => {
    const newStatus = deriveBriefStatus(creatives)
    await supabase.from("projects").update({ brief_status: newStatus }).eq("id", projectId)
    return newStatus
  }

  const handleSave = async () => {
    if (!editData || !selectedProject) return
    setSelectedProject(editData)
    setIsEditing(false)
    await supabase.from("projects").update({
      name: editData.name,
      project_type: editData.type,
      description: editData.description,
    }).eq("id", selectedProject.id)
  }

  const handleCancel = () => {
    setEditData(selectedProject)
    setIsEditing(false)
  }

  const handleCreativeClick = (creative: Creative) => {
    if (selectedProject) router.push(`/communication?projectId=${selectedProject.id}&creativeId=${creative.id}`)
  }

  // Deliverable handlers
  const handleAddDeliverable = async () => {
    if (!selectedProject || !newDeliverable.name.trim()) return
    const deliverable: Deliverable = {
      id: `d${Date.now()}`,
      name: newDeliverable.name.trim(),
      status: "pending",
      dueDate: newDeliverable.dueDate || undefined,
    }
    const updatedDeliverables = [...selectedProject.deliverables, deliverable]
    const updatedProject = {
      ...selectedProject,
      deliverables: updatedDeliverables,
    }
    setSelectedProject(updatedProject)
    setEditData(updatedProject)
    setNewDeliverable({ name: "", dueDate: "" })
    setAddDeliverableOpen(false)
    await persistDeliverables(selectedProject.id, updatedDeliverables)
  }

  const handleToggleDeliverableStatus = async (deliverableId: string) => {
    if (!selectedProject) return
    const updatedDeliverables = selectedProject.deliverables.map((d) => {
      if (d.id === deliverableId) {
        const nextStatus: Record<Deliverable["status"], Deliverable["status"]> = {
          pending: "in_progress",
          in_progress: "completed",
          completed: "pending",
        }
        return { ...d, status: nextStatus[d.status] }
      }
      return d
    })
    const updatedProject = { ...selectedProject, deliverables: updatedDeliverables }
    setSelectedProject(updatedProject)
    setEditData(updatedProject)
    await persistDeliverables(selectedProject.id, updatedDeliverables)
  }

  // Creative handlers
  const handleAddCreative = async () => {
    if (!selectedProject || !newCreative.name.trim()) return

    // Upload file if provided
    let thumbnailUrl: string | null = null
    const file = newCreative.file
    if (file) {
      const path = `${selectedProject.id}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from("creatives").upload(path, file)
      if (uploadErr) {
        console.error("File upload failed:", uploadErr)
        return
      }
      const { data: urlData } = supabase.storage.from("creatives").getPublicUrl(path)
      thumbnailUrl = urlData.publicUrl
    }

    const { data: inserted, error } = await supabase
      .from("creatives")
      .insert({
        project_id: selectedProject.id,
        name: newCreative.name.trim(),
        type: newCreative.type,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single()

    if (error || !inserted) {
      console.error("Failed to add creative:", error)
      return
    }

    // Insert first iteration if file was uploaded
    if (file && thumbnailUrl) {
      await supabase.from("creative_iterations").insert({
        creative_id: inserted.id,
        version: 1,
        file_url: thumbnailUrl,
        file_type: file.type,
        file_name: file.name,
      })
    }

    const creative: Creative = {
      id: inserted.id,
      name: inserted.name,
      type: inserted.type as Creative["type"],
      thumbnailUrl: thumbnailUrl || "",
      updatedAt: "Just now",
      feedbackCount: inserted.feedback_count,
      iteration: inserted.iteration,
      status: inserted.status as Creative["status"],
    }
    const updatedCreatives = [...selectedProject.creatives, creative]
    const updatedProject = {
      ...selectedProject,
      creatives: updatedCreatives,
    }
    setSelectedProject(updatedProject)
    setEditData(updatedProject)
    setNewCreative({ name: "", type: "design", file: null, filePreview: "" })
    setAddCreativeOpen(false)

    const newStatus = await recalculateBriefStatus(selectedProject.id, updatedCreatives)
    setSelectedProject((prev) => prev ? { ...prev, status: newStatus } : prev)
  }

  // Team member handler
  const handleAddTeamMember = async () => {
    if (!selectedProject || !newTeamMember.name.trim()) return
    const orgMember = orgMembers.find((m) => m.name === newTeamMember.name)
    if (!orgMember) return
    const member: TeamMember = {
      id: orgMember.id,
      name: newTeamMember.name.trim(),
      role: newTeamMember.role,
      avatar: orgMember.avatar || undefined,
    }
    const updatedTeam = [...selectedProject.team, member]
    const updatedProject = { ...selectedProject, team: updatedTeam }
    setSelectedProject(updatedProject)
    setEditData(updatedProject)
    setNewTeamMember({ name: "", role: "Designer" })
    setMemberSearchQuery("")
    setAddTeamMemberOpen(false)
    // Persist to project_members table
    await supabase.from("project_members").upsert({
      project_id: selectedProject.id,
      member_id: orgMember.id,
      role: "member",
    }, { onConflict: "project_id,member_id" })
  }

  const handleUpdateClient = async (data: Record<string, unknown>) => {
    if (!organizationId) return
    const d = data as {
      brandName: string
      industry: string
      websiteUrl: string
      officeAddress: string
      contactAddress: string
      sameAsOffice: boolean
      logo: File | null
      logoPreview: string
      contacts: { name: string; email: string; countryCode: string; phone: string }[]
      socialLinks: { platform: string; url: string }[]
      fontRows: { label: string; font: string }[]
      customFonts: { name: string; file: File }[]
      brandImages: string[]
      colorRows: { hex: string; font: string; name: string }[]
    }

    // Upload logo if a new file was selected
    let logoUrl: string | null = d.logoPreview || null
    if (d.logo) {
      const ext = d.logo.name.split(".").pop()
      const path = `${organizationId}/${Date.now()}-logo.${ext}`
      const { error: uploadErr } = await supabase.storage.from("client-assets").upload(path, d.logo)
      if (!uploadErr) {
        logoUrl = supabase.storage.from("client-assets").getPublicUrl(path).data.publicUrl
      }
    }

    // Upload new brand images (data URLs from file picker)
    const brandImageUrls: string[] = []
    for (const img of d.brandImages) {
      if (img.startsWith("http")) {
        brandImageUrls.push(img)
      } else {
        const res = await fetch(img)
        const blob = await res.blob()
        const ext = blob.type.split("/").pop() || "png"
        const path = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: imgErr } = await supabase.storage.from("client-assets").upload(path, blob)
        if (!imgErr) {
          brandImageUrls.push(supabase.storage.from("client-assets").getPublicUrl(path).data.publicUrl)
        }
      }
    }

    // Upload custom fonts
    const fontsJson = d.fontRows
      .filter((f) => f.font.trim())
      .map((f) => ({ label: f.label, font_name: f.font, font_url: null as string | null }))

    for (const customFont of d.customFonts) {
      const path = `${organizationId}/${Date.now()}-${customFont.name}`
      const { error: fontErr } = await supabase.storage.from("client-assets").upload(path, customFont.file)
      if (!fontErr) {
        fontsJson.push({
          label: customFont.name,
          font_name: customFont.name,
          font_url: supabase.storage.from("client-assets").getPublicUrl(path).data.publicUrl,
        })
      }
    }

    const { error } = await supabase
      .from("clients")
      .update({
        name: d.brandName?.trim() || client.name,
        industry: d.industry || null,
        website_url: d.websiteUrl || null,
        office_address: d.officeAddress || null,
        contact_address: d.sameAsOffice ? d.officeAddress || null : d.contactAddress || null,
        logo_url: logoUrl,
        contacts: d.contacts
          .filter((c) => c.name.trim() || c.email.trim())
          .map((c) => ({ name: c.name.trim(), email: c.email.trim() || null, country_code: c.countryCode, phone: c.phone.trim() || null })),
        social_links: d.socialLinks
          .filter((s) => s.url.trim())
          .map((s) => ({ platform: s.platform, url: s.url.trim() })),
        fonts: fontsJson,
        colors: d.colorRows
          .filter((c) => c.hex.trim())
          .map((c) => ({ hex: c.hex, font_label: c.font || null, name: c.name || null })),
        brand_image_urls: brandImageUrls,
      })
      .eq("id", client.id)

    if (error) {
      console.error("Failed to update client:", error)
      return
    }

    setEditClientOpen(false)
    router.refresh()
  }

  const getDeliverableStats = (deliverables: Deliverable[]) => {
    const total = deliverables.length
    const completed = deliverables.filter((d) => d.status === "completed").length
    return { total, completed }
  }

  const getStatusIcon = (status: Deliverable["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "in_progress": return <Clock className="w-4 h-4 text-amber-500" />
      default: return <Circle className="w-4 h-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return <main className="flex-1 overflow-hidden bg-background"><div className="h-full flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div></main>
  }

  const currentStatus = selectedProject ? statusConfig[selectedProject.status] : null
  const data = isEditing && editData ? editData : selectedProject

  return (
    <main className="flex-1 overflow-hidden bg-background flex flex-col">
      {/* Fixed Top Bar */}
      <div className="h-16 border-b border-[#5C6ECD]/20 bg-gradient-to-r from-[#5C6ECD]/5 via-[#8B5CF6]/5 to-[#5C6ECD]/5 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full border border-[#5C6ECD]/20 bg-white/80 flex items-center justify-center hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all">
            <ArrowLeft className="w-4 h-4 text-[#5C6ECD]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-sm border border-[#5C6ECD]/10 flex items-center justify-center p-1.5">
              {client.logoUrl ? <img src={client.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="font-bold text-[#5C6ECD]">{client.logo}</span>}
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg">{client.name}</h1>
              <p className="text-xs text-muted-foreground">{client.projects.length} active projects</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAssetsDrawerOpen(true)} className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#5C6ECD]/20 bg-white/80 hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all">
            <Layers className="w-4 h-4 text-[#5C6ECD]" />
            <span className="text-sm font-medium text-foreground">Brand Assets</span>
          </button>
          <button onClick={() => setEditClientOpen(true)} className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#5C6ECD]/20 bg-white/80 hover:bg-white hover:border-[#5C6ECD]/40 hover:shadow-sm transition-all">
            <Settings className="w-4 h-4 text-[#5C6ECD] group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium text-foreground">Edit Client</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Projects List */}
        <div className="w-[320px] min-w-[320px] border-r border-border flex flex-col bg-card h-full">
          <div className="p-3 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-muted/50 border-0" />
            </div>
            <FilterTags selectedFilter={statusFilter} onFilterChange={setStatusFilter} projectCounts={projectCounts} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isSelected={selectedProject?.id === project.id} onClick={() => handleProjectSelect(project)} clientLogo={client.logoUrl} />
              ))}
              {filteredProjects.length === 0 && client.projects.length > 0 && <div className="p-8 text-center text-muted-foreground text-sm">No projects found</div>}
              {client.projects.length === 0 && (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#5C6ECD]/10 flex items-center justify-center mx-auto mb-3">
                    <FolderOpen className="w-6 h-6 text-[#5C6ECD]" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Create your first project to get started</p>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("revue:open-add-brief"))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5C6ECD] hover:bg-[#4a5bb8] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Panel - Empty State */}
        {!selectedProject && (
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full bg-muted/20">
            <div className="text-center max-w-sm mx-auto px-6">
              <div className="w-20 h-20 rounded-2xl bg-[#5C6ECD]/10 flex items-center justify-center mx-auto mb-5">
                <Briefcase className="w-10 h-10 text-[#5C6ECD]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Add your first project</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Create a project to start managing briefs, deliverables, and creatives for {client.name}.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("revue:open-add-brief"))}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#5C6ECD] hover:bg-[#4a5bb8] rounded-xl shadow-lg shadow-[#5C6ECD]/25 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            </div>
          </div>
        )}

        {/* Center Panel - Project Details */}
        {selectedProject && currentStatus && data && (
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Action Bar */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Input value={editData?.name || ""} onChange={(e) => setEditData((prev) => prev ? { ...prev, name: e.target.value } : null)} className="text-lg font-bold h-9 w-[200px]" placeholder="Project name" />
                ) : (
                  <h2 className="text-lg font-bold text-foreground">{data.name}</h2>
                )}
                {isEditing ? (
                  <Select value={editData?.type || ""} onValueChange={(value) => setEditData((prev) => prev ? { ...prev, type: value } : null)}>
                    <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{projectTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#5C6ECD]/10 text-[#5C6ECD] border border-[#5C6ECD]/20">{data.type}</span>
                )}
                <ModeBadge mode={data.workmode} />
              </div>
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", currentStatus.bgColor, "text-white")}>
                  <currentStatus.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{currentStatus.label}</span>
                </div>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel} size="sm"><X className="w-4 h-4 mr-2" />Cancel</Button>
                    <Button onClick={handleSave} size="sm" className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"><FileCheck className="w-4 h-4 mr-2" />Save</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)} size="sm"><Pencil className="w-4 h-4 mr-2" />Edit</Button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-muted/30">
              <div className="p-6 space-y-6">
                {/* Description */}
                {(data.description || isEditing) && (
                  <div className="pb-4 border-b border-border">
                    {isEditing ? (
                      <Textarea value={editData?.description || ""} onChange={(e) => setEditData((prev) => prev ? { ...prev, description: e.target.value } : null)} className="min-h-[60px] resize-none" placeholder="Add a description..." />
                    ) : (
                      <p className="text-muted-foreground text-sm leading-relaxed">{data.description}</p>
                    )}
                  </div>
                )}

                {/* Project Deliverables */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                        <Layers2 className="w-4 h-4 text-[#5C6ECD]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Deliverables</h3>
                        <p className="text-xs text-muted-foreground">{getDeliverableStats(data.deliverables).completed}/{getDeliverableStats(data.deliverables).total} completed</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setAddDeliverableOpen(true)}><Plus className="w-4 h-4 mr-2" />Add</Button>
                  </div>
                  <div className="space-y-2">
                    {data.deliverables.map((deliverable) => (
                      <div
                        key={deliverable.id}
                        onClick={() => handleToggleDeliverableStatus(deliverable.id)}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getStatusIcon(deliverable.status)}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-4 h-4 rounded-full border-2 border-[#5C6ECD] bg-white" />
                            </div>
                          </div>
                          <span className={cn("text-sm", deliverable.status === "completed" ? "text-muted-foreground line-through" : "text-foreground")}>{deliverable.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {deliverable.dueDate && <span className="text-xs text-muted-foreground">Due {deliverable.dueDate}</span>}
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full transition-colors",
                            deliverable.status === "completed" && "bg-emerald-500/10 text-emerald-600",
                            deliverable.status === "in_progress" && "bg-amber-500/10 text-amber-600",
                            deliverable.status === "pending" && "bg-muted text-muted-foreground"
                          )}>
                            {deliverable.status === "completed" ? "Done" : deliverable.status === "in_progress" ? "In Progress" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {data.deliverables.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No deliverables yet. Click "Add" to create one.
                      </div>
                    )}
                  </div>
                </div>

                {/* Creatives */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-foreground">Creatives</h3>
                      <span className="text-sm text-muted-foreground">({data.creatives.length})</span>
                    </div>
                    <Button size="sm" className="bg-[#5C6ECD] hover:bg-[#4a5bb8]" onClick={() => setAddCreativeOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Creative</Button>
                  </div>

                  {data.creatives.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[...data.creatives]
                        .sort((a, b) => {
                          // Sort in_progress first, then completed
                          if (a.status === "in_progress" && b.status === "completed") return -1
                          if (a.status === "completed" && b.status === "in_progress") return 1
                          return 0
                        })
                        .map((creative) => {
                        const TypeIcon = creativeTypeIcons[creative.type]
                        const isInProgress = creative.status === "in_progress"
                        return (
                          <div
                            key={creative.id}
                            onClick={() => handleCreativeClick(creative)}
                            className={cn(
                              "bg-card rounded-2xl border overflow-hidden transition-all group cursor-pointer",
                              isInProgress
                                ? "border-[#5C6ECD]/30 hover:border-[#5C6ECD] hover:shadow-lg hover:shadow-[#5C6ECD]/10"
                                : "border-border hover:border-[#5C6ECD]/50 hover:shadow-md"
                            )}
                          >
                            {/* Thumbnail */}
                            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                              <img src={creative.thumbnailUrl} alt={creative.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              {creative.type === "video" && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                    <Play className="w-6 h-6 text-foreground ml-1" />
                                  </div>
                                </div>
                              )}
                              {/* Version Badge */}
                              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold rounded-lg">
                                v{creative.iteration}
                              </div>
                              {/* Status Badge */}
                              <div className={cn(
                                "absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-lg backdrop-blur-sm",
                                isInProgress
                                  ? "bg-amber-500/90 text-white"
                                  : "bg-emerald-500/90 text-white"
                              )}>
                                {isInProgress ? "In Progress" : "Completed"}
                              </div>
                              {/* Open in Revue overlay on hover */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="text-white font-medium text-sm flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                                  <ExternalLink className="w-4 h-4" />
                                  Open in Revue
                                </span>
                              </div>
                            </div>
                            {/* Info */}
                            <div className="p-4">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center",
                                  isInProgress ? "bg-[#5C6ECD]/10" : "bg-emerald-500/10"
                                )}>
                                  <TypeIcon className={cn("w-4 h-4", isInProgress ? "text-[#5C6ECD]" : "text-emerald-600")} />
                                </div>
                                <h4 className="font-semibold text-foreground">{creative.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3 pl-9">Updated {creative.updatedAt}</p>
                              {/* Stats */}
                              <div className="flex items-center gap-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{creative.feedbackCount} feedbacks</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Layers2 className="w-3.5 h-3.5" />
                                  <span>Iteration {creative.iteration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border p-12 text-center bg-card">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No creatives yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Upload your first creative to start collaborating.</p>
                      <Button className="bg-[#5C6ECD] hover:bg-[#4a5bb8]" onClick={() => setAddCreativeOpen(true)}><Upload className="w-4 h-4 mr-2" />Add Creative</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Team & Resources */}
        {selectedProject && (
          <div className="w-[280px] min-w-[280px] border-l border-border flex flex-col bg-card">
            <ScrollArea className="flex-1">
              {/* Team Members */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-[#5C6ECD]" />
                    Team ({selectedProject.team.length})
                  </h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTeamModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedProject.team.slice(0, 4).map((member) => (
                    <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setTeamModalOpen(true)}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-[#5C6ECD] text-white text-xs">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                      </div>
                    </div>
                  ))}
                  {selectedProject.team.length > 4 && (
                    <button onClick={() => setTeamModalOpen(true)} className="w-full text-xs text-[#5C6ECD] hover:underline py-2">
                      View all {selectedProject.team.length} members
                    </button>
                  )}
                </div>
              </div>

              {/* References Section */}
              {selectedProject.references && selectedProject.references.length > 0 && (
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-3">
                    <FolderOpen className="w-4 h-4 text-[#5C6ECD]" />
                    References
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.references.map((ref, index) => (
                      <div
                        key={ref.id}
                        onClick={() => ref.url && setPreviewRef(ref)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded bg-foreground text-background flex items-center justify-center text-[10px] font-bold flex-shrink-0">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{ref.name}</p>
                          {ref.size && <p className="text-[10px] text-muted-foreground">{ref.size}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); ref.url && setPreviewRef(ref) }}><Eye className="w-3 h-3" /></Button>
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
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-[#5C6ECD]/30 transition-colors group">
                        <div className="w-6 h-6 rounded bg-[#5C6ECD]/10 flex items-center justify-center flex-shrink-0"><ExternalLink className="w-3 h-3 text-[#5C6ECD]" /></div>
                        <span className="text-xs font-medium text-foreground truncate flex-1">{link.name}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Quick Stats */}
            <div className="p-4 border-t border-border space-y-3 flex-shrink-0 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Days Left</span>
                <span className={cn("font-bold", selectedProject.daysLeft <= 3 ? "text-red-500" : selectedProject.daysLeft <= 5 ? "text-orange-500" : "text-foreground")}>{selectedProject.daysLeft} days</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <ModeBadge mode={selectedProject.workmode} />
              </div>
            </div>
          </div>
        )}
      </div>

      <AssetsDrawer open={assetsDrawerOpen} onOpenChange={setAssetsDrawerOpen} client={client} />
      {selectedProject && <TeamMembersModal open={teamModalOpen} onOpenChange={setTeamModalOpen} team={selectedProject.team} projectName={selectedProject.name} orgMembers={orgMembers} onToggleMember={async (member) => {
        const isAssigned = selectedProject.team.some(t => t.id === member.id)
        if (isAssigned) {
          // Remove
          const updatedTeam = selectedProject.team.filter(t => t.id !== member.id)
          setSelectedProject({ ...selectedProject, team: updatedTeam })
          setEditData({ ...selectedProject, team: updatedTeam })
          await supabase.from("project_members").delete().eq("project_id", selectedProject.id).eq("member_id", member.id)
        } else {
          // Add
          const newMember: TeamMember = { id: member.id, name: member.name, role: "member", avatar: member.avatar }
          const updatedTeam = [...selectedProject.team, newMember]
          setSelectedProject({ ...selectedProject, team: updatedTeam })
          setEditData({ ...selectedProject, team: updatedTeam })
          await supabase.from("project_members").upsert({ project_id: selectedProject.id, member_id: member.id, role: "member" }, { onConflict: "project_id,member_id" })
        }
      }} />}

      {/* Add Deliverable Modal */}
      <Dialog open={addDeliverableOpen} onOpenChange={setAddDeliverableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <Layers2 className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              Add Deliverable
            </DialogTitle>
            <DialogDescription>Create a new deliverable for this project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Deliverable Name *</label>
              <Input
                placeholder="e.g., Homepage Design, Logo Variants..."
                value={newDeliverable.name}
                onChange={(e) => setNewDeliverable((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Due Date (Optional)</label>
              <Input
                type="date"
                value={newDeliverable.dueDate}
                onChange={(e) => setNewDeliverable((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddDeliverableOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddDeliverable}
              disabled={!newDeliverable.name.trim()}
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deliverable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Creative Modal */}
      <Dialog open={addCreativeOpen} onOpenChange={setAddCreativeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              Add Creative
            </DialogTitle>
            <DialogDescription>Upload a new creative asset for this project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Creative Name *</label>
              <Input
                placeholder="e.g., Hero Banner, Product Cards..."
                value={newCreative.name}
                onChange={(e) => setNewCreative((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
              <Select
                value={newCreative.type}
                onValueChange={(value: Creative["type"]) => setNewCreative((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Design
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      Image
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Upload File (Optional)</label>
              <input
                ref={creativeFileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,.pdf,.psd,.ai,.fig"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setNewCreative((prev) => ({
                      ...prev,
                      file,
                      filePreview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
                    }))
                  }
                }}
              />
              {newCreative.file ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  {newCreative.filePreview ? (
                    <img src={newCreative.filePreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-[#5C6ECD]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{newCreative.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(newCreative.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (newCreative.filePreview) URL.revokeObjectURL(newCreative.filePreview)
                      setNewCreative((prev) => ({ ...prev, file: null, filePreview: "" }))
                      if (creativeFileInputRef.current) creativeFileInputRef.current.value = ""
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => creativeFileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border hover:border-[#5C6ECD]/50 hover:bg-[#5C6ECD]/5 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload a file</span>
                  <span className="text-xs text-muted-foreground">Images, Videos, PDF, PSD, AI, Figma</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddCreativeOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddCreative}
              disabled={!newCreative.name.trim()}
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Creative
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reference Preview Dialog */}
      <Dialog open={!!previewRef} onOpenChange={(open) => { if (!open) setPreviewRef(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              {previewRef?.name}
            </DialogTitle>
            <DialogDescription>Reference file preview</DialogDescription>
          </DialogHeader>
          {previewRef?.url && (
            <div className="mt-4 flex items-center justify-center overflow-auto max-h-[65vh] rounded-lg bg-muted/30 border border-border">
              {(() => {
                const url = previewRef.url!
                const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || ''
                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
                const videoExts = ['mp4', 'webm', 'ogg', 'mov']
                const pdfExts = ['pdf']
                if (imageExts.includes(ext)) {
                  return <img src={url} alt={previewRef.name} className="max-w-full max-h-[65vh] object-contain" />
                }
                if (videoExts.includes(ext)) {
                  return <video src={url} controls className="max-w-full max-h-[65vh]" />
                }
                if (pdfExts.includes(ext)) {
                  return <iframe src={url} className="w-full h-[65vh]" title={previewRef.name} />
                }
                return (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
                    <Button asChild variant="outline">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </a>
                    </Button>
                  </div>
                )
              })()}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            {previewRef?.url && (
              <Button asChild variant="outline" size="sm">
                <a href={previewRef.url} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPreviewRef(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={addTeamMemberOpen} onOpenChange={(open) => { setAddTeamMemberOpen(open); if (!open) { setMemberDropdownOpen(false); setMemberSearchQuery("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              Add Team Member
            </DialogTitle>
            <DialogDescription>Select an organization member to add to this project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Member Selector Dropdown */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Team Member *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg text-left transition-colors",
                    memberDropdownOpen
                      ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-background"
                      : "border-border bg-background hover:border-[#5C6ECD]/50"
                  )}
                >
                  {(() => {
                    const selected = orgMembers.find((m) => m.name === newTeamMember.name)
                    if (selected) {
                      return (
                        <>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={selected.avatar} alt={selected.name} />
                            <AvatarFallback className="bg-[#5C6ECD] text-white text-xs">{selected.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{selected.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{selected.email}</p>
                          </div>
                        </>
                      )
                    }
                    return <span className="flex-1 text-muted-foreground text-sm">Select team member...</span>
                  })()}
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", memberDropdownOpen && "rotate-180 text-[#5C6ECD]")} />
                </button>
                {memberDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Search members..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:border-[#5C6ECD] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {(() => {
                        const filtered = orgMembers.filter((m) =>
                          m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        )
                        // Exclude members already on the team
                        const available = filtered.filter((m) => !selectedProject?.team.some((t) => t.name === m.name))
                        if (available.length === 0) {
                          return <div className="px-4 py-3 text-sm text-muted-foreground text-center">No members found</div>
                        }
                        return available.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setNewTeamMember((prev) => ({ ...prev, name: member.name }))
                              setMemberDropdownOpen(false)
                              setMemberSearchQuery("")
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#5C6ECD]/10 transition-colors",
                              newTeamMember.name === member.name && "bg-[#5C6ECD]/10"
                            )}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback className="bg-[#5C6ECD] text-white text-xs">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm truncate", newTeamMember.name === member.name ? "font-medium text-[#5C6ECD]" : "text-foreground")}>{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            </div>
                            {newTeamMember.name === member.name && <CheckCircle className="w-4 h-4 text-[#5C6ECD] shrink-0" />}
                          </button>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Role Selector */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Role</label>
              <Select value={newTeamMember.role} onValueChange={(value) => setNewTeamMember((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["Client Servicing", "Designer", "Developer", "Project Manager", "QC Analyst", "Content Writer", "Marketing", "Lead Designer", "UI Designer", "Reviewer"].map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setAddTeamMemberOpen(false); setMemberSearchQuery("") }}>Cancel</Button>
            <Button
              onClick={handleAddTeamMember}
              disabled={!newTeamMember.name.trim()}
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 2s ease infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Edit Client Onboarding */}
      {clientEditData && (
        <NewClientOnboarding
          open={editClientOpen}
          onClose={() => setEditClientOpen(false)}
          editMode
          initialData={clientEditData as Partial<ClientFormData>}
          onComplete={(data) => handleUpdateClient(data as unknown as Record<string, unknown>)}
        />
      )}
    </main>
  )
}
