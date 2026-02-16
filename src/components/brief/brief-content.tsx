"use client"

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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

// Sample data
const sampleProjectData: Record<string, ProjectData> = {
  "p1": {
    id: "p1",
    name: "Revitalise Brand Identity",
    type: "Branding",
    description: "Complete brand refresh including logo redesign, color palette update, and brand guidelines documentation for TechVision Labs.",
    creatives: [
      {
        id: "c1",
        name: "Logo Concepts",
        type: "design",
        thumbnailUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=300&fit=crop",
        createdAt: "2024-07-10",
        updatedAt: "2 hours ago",
        feedbackCount: 5,
        unresolvedCount: 2,
        deliverables: [
          { id: "d1", name: "Primary Logo", status: "completed" },
          { id: "d2", name: "Logo Variations", status: "in_progress", dueDate: "Jul 15" },
          { id: "d3", name: "Icon/Favicon", status: "pending", dueDate: "Jul 18" },
        ],
      },
      {
        id: "c2",
        name: "Color Palette",
        type: "design",
        thumbnailUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=300&fit=crop",
        createdAt: "2024-07-11",
        updatedAt: "1 day ago",
        feedbackCount: 3,
        unresolvedCount: 0,
        deliverables: [
          { id: "d4", name: "Primary Colors", status: "completed" },
          { id: "d5", name: "Secondary Colors", status: "completed" },
          { id: "d6", name: "Gradient Variations", status: "in_progress", dueDate: "Jul 16" },
        ],
      },
      {
        id: "c3",
        name: "Typography System",
        type: "design",
        thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop",
        createdAt: "2024-07-12",
        updatedAt: "3 days ago",
        feedbackCount: 8,
        unresolvedCount: 1,
        deliverables: [
          { id: "d7", name: "Heading Styles", status: "in_progress", dueDate: "Jul 14" },
          { id: "d8", name: "Body Text Styles", status: "pending", dueDate: "Jul 17" },
        ],
      },
      {
        id: "c4",
        name: "Brand Guidelines",
        type: "document",
        thumbnailUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
        createdAt: "2024-07-13",
        updatedAt: "5 hours ago",
        feedbackCount: 2,
        unresolvedCount: 2,
        deliverables: [
          { id: "d9", name: "Logo Usage Guidelines", status: "pending", dueDate: "Jul 19" },
          { id: "d10", name: "Color Usage Guidelines", status: "pending", dueDate: "Jul 19" },
          { id: "d11", name: "Typography Guidelines", status: "pending", dueDate: "Jul 20" },
          { id: "d12", name: "Final Brand Book PDF", status: "pending", dueDate: "Jul 20" },
        ],
      },
    ],
  },
}

// Fill in sample data for other IDs
for (let i = 2; i <= 6; i++) {
  sampleProjectData[`p${i}`] = {
    ...sampleProjectData["p1"],
    id: `p${i}`,
    name: `Project ${i}`,
    creatives: [
      {
        id: `c${i}1`,
        name: "Initial Design",
        type: "design",
        thumbnailUrl: `https://images.unsplash.com/photo-162678577457${i}-4b799315345d?w=400&h=300&fit=crop`,
        createdAt: "2024-07-10",
        updatedAt: "1 day ago",
        feedbackCount: 3,
        unresolvedCount: 1,
        deliverables: [
          { id: `d${i}1`, name: "First Draft", status: "completed" },
          { id: `d${i}2`, name: "Revisions", status: "in_progress" },
        ],
      },
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
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [editData, setEditData] = useState<ProjectData | null>(null)
  const [expandedCreatives, setExpandedCreatives] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = sampleProjectData[briefId] || sampleProjectData["p1"]
      setProjectData(data)
      setEditData(data)
      // Expand first creative by default
      if (data.creatives.length > 0) {
        setExpandedCreatives(new Set([data.creatives[0].id]))
      }
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [briefId])

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
    router.push(`/communication?briefId=${briefId}&iterationId=${creative.id}`)
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
            <Button className="bg-[#5C6ECD] hover:bg-[#4a5bb8]">
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
                          <img
                            src={creative.thumbnailUrl}
                            alt={creative.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
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
                                  <DropdownMenuItem className="text-destructive">
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
                                  width: `${(stats.completed / stats.total) * 100}%`,
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
                    {isExpanded && creative.deliverables.length > 0 && (
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
                          <button className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-[#5C6ECD]/50 transition-colors">
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
                Start by uploading your first creative. Each creative can have its
                own deliverables to track.
              </p>
              <Button className="bg-[#5C6ECD] hover:bg-[#4a5bb8]">
                <Upload className="w-4 h-4 mr-2" />
                Upload Creative
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
