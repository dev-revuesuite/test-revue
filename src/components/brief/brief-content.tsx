"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Plus,
  MessageSquare,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  Upload,
  FileImage,
  Video,
  FileText,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

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
  createdAt: string
  updatedAt: string
  feedbackCount: number
  unresolvedCount: number
  deliverables: Deliverable[]
  isExpanded?: boolean
}

interface ProjectData {
  id: string
  name: string
  type: string
  description: string
  creatives: Creative[]
}

const projectTypes = [
  "Branding",
  "Social Media",
  "Web Design",
  "Print Design",
  "Motion Graphics",
  "Packaging",
  "Illustration",
  "Photography",
  "Video Production",
  "Other",
]

const creativeTypeIcons: Record<Creative["type"], typeof ImageIcon> = {
  image: FileImage,
  video: Video,
  document: FileText,
  design: Palette,
}

interface BriefContentProps {
  projectData: ProjectData | null
}

export function BriefContent({ projectData: initialData }: BriefContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading] = useState(false)
  const [projectData, setProjectData] = useState<ProjectData | null>(initialData)
  const [editData, setEditData] = useState<ProjectData | null>(initialData)
  const [expandedCreatives, setExpandedCreatives] = useState<Set<string>>(
    () => {
      if (initialData && initialData.creatives.length > 0) {
        return new Set([initialData.creatives[0].id])
      }
      return new Set()
    }
  )

  // Add Creative dialog state
  const [addCreativeOpen, setAddCreativeOpen] = useState(false)
  const [newCreative, setNewCreative] = useState({ name: "", type: "design" as Creative["type"], thumbnailUrl: "" })

  // Add Deliverable per-creative state
  const [addDeliverableCreativeId, setAddDeliverableCreativeId] = useState<string | null>(null)
  const [newDeliverableName, setNewDeliverableName] = useState("")

  type StatusKey = "brief_received" | "qc_pending" | "review_qc" | "iteration_shared" | "feedback_received" | "iteration_approved" | "completed"

  const deriveBriefStatus = (creatives: Creative[]): StatusKey => {
    if (creatives.length === 0) return "brief_received"
    if (creatives.every((c) => c.deliverables.length > 0 && c.deliverables.every((d) => d.status === "completed"))) return "completed"
    if (creatives.some((c) => c.deliverables.some((d) => d.status === "completed"))) return "feedback_received"
    return "qc_pending"
  }

  const recalculateBriefStatus = async (creatives: Creative[]) => {
    if (!projectData) return
    const newStatus = deriveBriefStatus(creatives)
    await supabase.from("projects").update({ brief_status: newStatus }).eq("id", projectData.id)
  }

  const handleSave = () => {
    if (editData) {
      setProjectData(editData)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditData(projectData)
    setIsEditing(false)
  }

  const toggleCreativeExpand = (creativeId: string) => {
    setExpandedCreatives((prev) => {
      const next = new Set(prev)
      if (next.has(creativeId)) {
        next.delete(creativeId)
      } else {
        next.add(creativeId)
      }
      return next
    })
  }

  const handleCreativeClick = (creative: Creative) => {
    router.push(`/communication?briefId=${projectData?.id}&iterationId=${creative.id}`)
  }

  const getDeliverableStats = (deliverables: Deliverable[]) => {
    const total = deliverables.length
    const completed = deliverables.filter((d) => d.status === "completed").length
    const inProgress = deliverables.filter((d) => d.status === "in_progress").length
    return { total, completed, inProgress }
  }

  const getStatusIcon = (status: Deliverable["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "in_progress":
        return <Clock className="w-4 h-4 text-amber-500" />
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Add Creative handler
  const handleAddCreative = async () => {
    if (!projectData || !newCreative.name.trim()) return
    const { data: inserted, error } = await supabase
      .from("creatives")
      .insert({
        project_id: projectData.id,
        name: newCreative.name.trim(),
        type: newCreative.type,
        thumbnail_url: newCreative.thumbnailUrl || null,
      })
      .select()
      .single()

    if (error || !inserted) {
      console.error("Failed to add creative:", error)
      return
    }

    const creative: Creative = {
      id: inserted.id,
      name: inserted.name,
      type: inserted.type as Creative["type"],
      thumbnailUrl: inserted.thumbnail_url || "",
      createdAt: inserted.created_at || "",
      updatedAt: "Just now",
      feedbackCount: 0,
      unresolvedCount: 0,
      deliverables: [],
    }
    const updatedCreatives = [...projectData.creatives, creative]
    const updated = { ...projectData, creatives: updatedCreatives }
    setProjectData(updated)
    setEditData(updated)
    setNewCreative({ name: "", type: "design", thumbnailUrl: "" })
    setAddCreativeOpen(false)
    setExpandedCreatives((prev) => new Set([...prev, creative.id]))
    await recalculateBriefStatus(updatedCreatives)
  }

  // Delete Creative handler
  const handleDeleteCreative = async (creativeId: string) => {
    if (!projectData) return
    const { error } = await supabase.from("creatives").delete().eq("id", creativeId)
    if (error) {
      console.error("Failed to delete creative:", error)
      return
    }
    const updatedCreatives = projectData.creatives.filter((c) => c.id !== creativeId)
    const updated = { ...projectData, creatives: updatedCreatives }
    setProjectData(updated)
    setEditData(updated)
    await recalculateBriefStatus(updatedCreatives)
  }

  // Add Deliverable to a creative handler
  const handleAddDeliverableToCreative = async (creativeId: string) => {
    if (!projectData || !newDeliverableName.trim()) return
    const creative = projectData.creatives.find((c) => c.id === creativeId)
    if (!creative) return

    const newDeliverable: Deliverable = {
      id: `d${Date.now()}`,
      name: newDeliverableName.trim(),
      status: "pending",
    }
    const updatedDeliverables = [...creative.deliverables, newDeliverable]

    const { error } = await supabase
      .from("creatives")
      .update({ deliverables: updatedDeliverables })
      .eq("id", creativeId)

    if (error) {
      console.error("Failed to add deliverable:", error)
      return
    }

    const updatedCreatives = projectData.creatives.map((c) =>
      c.id === creativeId ? { ...c, deliverables: updatedDeliverables } : c
    )
    const updated = { ...projectData, creatives: updatedCreatives }
    setProjectData(updated)
    setEditData(updated)
    setNewDeliverableName("")
    setAddDeliverableCreativeId(null)
  }

  if (isLoading || !projectData) {
    return (
      <main className="flex-1 overflow-auto bg-background p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  const data = isEditing ? editData! : projectData

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0 mt-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={editData?.name || ""}
                    onChange={(e) =>
                      setEditData((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    className="text-2xl font-bold h-auto py-1 px-2 mb-2"
                    placeholder="Project name"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {data.name}
                  </h1>
                )}
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <Select
                      value={editData?.type || ""}
                      onValueChange={(value) =>
                        setEditData((prev) =>
                          prev ? { ...prev, type: value } : null
                        )
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#5C6ECD]/10 text-[#5C6ECD] border border-[#5C6ECD]/20">
                      {data.type}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit/Save Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  size="sm"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="ml-14">
            {isEditing ? (
              <Textarea
                value={editData?.description || ""}
                onChange={(e) =>
                  setEditData((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                className="min-h-[80px] resize-none"
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                {data.description || "No description provided"}
              </p>
            )}
          </div>
        </header>

        {/* Creatives Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Creatives</h2>
              <span className="text-sm text-muted-foreground">
                ({data.creatives.length})
              </span>
            </div>
            <Button
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
              onClick={() => setAddCreativeOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Creative
            </Button>
          </div>

          {data.creatives.length > 0 ? (
            <div className="space-y-4">
              {data.creatives.map((creative) => {
                const isExpanded = expandedCreatives.has(creative.id)
                const stats = getDeliverableStats(creative.deliverables)
                const TypeIcon = creativeTypeIcons[creative.type]

                return (
                  <div
                    key={creative.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Creative Header */}
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div
                          onClick={() => handleCreativeClick(creative)}
                          className="w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer group relative"
                        >
                          {creative.thumbnailUrl ? (
                            <img
                              src={creative.thumbnailUrl}
                              alt={creative.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5C6ECD] to-[#8B5CF6]">
                              <TypeIcon className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>

                        {/* Creative Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="font-semibold text-foreground">
                                  {creative.name}
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Updated {creative.updatedAt}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Feedback Badge */}
                              {creative.unresolvedCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                                  <MessageSquare className="w-3 h-3" />
                                  {creative.unresolvedCount} unresolved
                                </div>
                              )}

                              {/* Actions Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteCreative(creative.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">
                                Deliverables
                              </span>
                              <span className="font-medium text-foreground">
                                {stats.completed}/{stats.total} completed
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{
                                  width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleCreativeExpand(creative.id)}
                        className="flex items-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {isExpanded ? "Hide" : "Show"} deliverables (
                        {creative.deliverables.length})
                      </button>
                    </div>

                    {/* Deliverables List */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-4">
                        <div className="space-y-2">
                          {creative.deliverables.map((deliverable) => (
                            <div
                              key={deliverable.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-[#5C6ECD]/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(deliverable.status)}
                                <span
                                  className={cn(
                                    "text-sm",
                                    deliverable.status === "completed"
                                      ? "text-muted-foreground line-through"
                                      : "text-foreground"
                                  )}
                                >
                                  {deliverable.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {deliverable.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    Due {deliverable.dueDate}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    deliverable.status === "completed" &&
                                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                    deliverable.status === "in_progress" &&
                                      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                    deliverable.status === "pending" &&
                                      "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {deliverable.status === "completed"
                                    ? "Done"
                                    : deliverable.status === "in_progress"
                                    ? "In Progress"
                                    : "Pending"}
                                </span>
                              </div>
                            </div>
                          ))}

                          {/* Add Deliverable Button */}
                          <button
                            onClick={() => {
                              setAddDeliverableCreativeId(creative.id)
                              setNewDeliverableName("")
                            }}
                            className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-[#5C6ECD]/50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add deliverable
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No creatives yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start by adding your first creative. Each creative can have its
                own deliverables to track.
              </p>
              <Button
                className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
                onClick={() => setAddCreativeOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Creative
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Add Creative Dialog */}
      <Dialog open={addCreativeOpen} onOpenChange={setAddCreativeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              Add Creative
            </DialogTitle>
            <DialogDescription>Add a new creative asset for this project</DialogDescription>
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
                    <div className="flex items-center gap-2"><Palette className="w-4 h-4" /> Design</div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2"><FileImage className="w-4 h-4" /> Image</div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Video</div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Document</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Thumbnail URL (Optional)</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={newCreative.thumbnailUrl}
                onChange={(e) => setNewCreative((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for a default thumbnail</p>
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

      {/* Add Deliverable Dialog */}
      <Dialog open={!!addDeliverableCreativeId} onOpenChange={(open) => { if (!open) setAddDeliverableCreativeId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-[#5C6ECD]" />
              </div>
              Add Deliverable
            </DialogTitle>
            <DialogDescription>Add a deliverable to this creative</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Deliverable Name *</label>
              <Input
                placeholder="e.g., Final mockup, Icon set..."
                value={newDeliverableName}
                onChange={(e) => setNewDeliverableName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDeliverableName.trim() && addDeliverableCreativeId) {
                    handleAddDeliverableToCreative(addDeliverableCreativeId)
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddDeliverableCreativeId(null)}>Cancel</Button>
            <Button
              onClick={() => addDeliverableCreativeId && handleAddDeliverableToCreative(addDeliverableCreativeId)}
              disabled={!newDeliverableName.trim()}
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deliverable
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
