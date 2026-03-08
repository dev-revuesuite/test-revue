"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Grid3X3,
  List,
  Search,
  Image as ImageIcon,
  FileText,
  Film,
  File,
  Calendar,
  Filter,
  ArrowUpDown,
  Check,
  Clock,
  HardDrive,
  ExternalLink,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Data types from server
export interface DriveClient {
  id: string
  name: string
  logoUrl?: string
  projectCount: number
}

export interface DriveProject {
  id: string
  name: string
  type: string
  clientId: string
  creativesCount: number
  createdAt: string
}

export interface DriveCreative {
  id: string
  name: string
  projectId: string
  type: string
  thumbnailUrl?: string
  status: string
  iteration: number
  createdAt: string
}

interface MasterDriveContentProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  organizationName: string
  clients: DriveClient[]
  projects: DriveProject[]
  creatives: DriveCreative[]
}

// Types
type ViewType = "grid" | "list"
type FolderType = "root" | "client" | "project"
type SortBy = "name" | "date" | "type"
type SortOrder = "asc" | "desc"

interface BreadcrumbItem {
  id: string
  name: string
  type: FolderType
}

interface FolderItem {
  id: string
  name: string
  type: "folder" | "creative"
  createdAt: string
  itemCount?: number
  logoUrl?: string
  projectType?: string
  // Creative-specific
  thumbnailUrl?: string
  status?: string
  iteration?: number
  creativeType?: string
  projectId?: string
}

const statusLabels: Record<string, string> = {
  in_progress: "In Progress",
  completed: "Completed",
  pending: "Pending",
  review: "Review",
}

const statusColors: Record<string, string> = {
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  pending: "bg-amber-500",
  review: "bg-purple-500",
}

// macOS Style Folder Icon Component
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 52" fill="none" className={className}>
      <ellipse cx="32" cy="49" rx="26" ry="3" fill="black" fillOpacity="0.1" />
      <path
        d="M4 10C4 7.79086 5.79086 6 8 6H22L26 10H56C58.2091 10 60 11.7909 60 14V14H4V10Z"
        fill="#5AB2F6"
      />
      <path
        d="M2 14C2 12.8954 2.89543 12 4 12H60C61.1046 12 62 12.8954 62 14V44C62 45.1046 61.1046 46 60 46H4C2.89543 46 2 45.1046 2 44V14Z"
        fill="url(#macFolderGradient)"
      />
      <path
        d="M2 14C2 12.8954 2.89543 12 4 12H60C61.1046 12 62 12.8954 62 14V16H2V14Z"
        fill="white"
        fillOpacity="0.3"
      />
      <path
        d="M2 42H62V44C62 45.1046 61.1046 46 60 46H4C2.89543 46 2 45.1046 2 44V42Z"
        fill="black"
        fillOpacity="0.1"
      />
      <defs>
        <linearGradient id="macFolderGradient" x1="32" y1="12" x2="32" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6BC1FF" />
          <stop offset="1" stopColor="#3D9FE8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Skeleton Components
function FolderGridSkeleton() {
  return (
    <div className="flex flex-col items-center p-2 animate-pulse">
      <div className="w-14 h-12 rounded bg-muted mb-2" />
      <div className="h-3 w-14 bg-muted rounded" />
    </div>
  )
}

function FolderListSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 animate-pulse">
      <div className="w-8 h-7 rounded bg-muted" />
      <div className="h-3 w-28 bg-muted rounded" />
    </div>
  )
}

function CreativeCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    </div>
  )
}

export function MasterDriveContent({ user, organizationName, clients, projects, creatives }: MasterDriveContentProps) {
  const router = useRouter()
  const [viewType, setViewType] = useState<ViewType>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "Master Drive", type: "root" }
  ])
  const [currentLevel, setCurrentLevel] = useState<FolderType>("root")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Simulate loading when navigating
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [currentLevel, selectedClientId, selectedProjectId])

  const getCurrentItems = (): FolderItem[] => {
    switch (currentLevel) {
      case "root":
        return clients.map((c) => ({
          id: c.id,
          name: c.name,
          type: "folder" as const,
          createdAt: "",
          itemCount: c.projectCount,
          logoUrl: c.logoUrl,
        }))
      case "client":
        return projects
          .filter((p) => p.clientId === selectedClientId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            type: "folder" as const,
            createdAt: p.createdAt,
            itemCount: p.creativesCount,
            projectType: p.type,
          }))
      case "project":
        return creatives
          .filter((c) => c.projectId === selectedProjectId)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: "creative" as const,
            createdAt: c.createdAt,
            thumbnailUrl: c.thumbnailUrl,
            status: c.status,
            iteration: c.iteration,
            creativeType: c.type,
            projectId: c.projectId,
          }))
      default:
        return []
    }
  }

  const navigateToFolder = (item: FolderItem) => {
    if (item.type === "creative") {
      // Navigate to Revue communication page
      router.push(`/revue?projectId=${item.projectId}&creativeId=${item.id}`)
      return
    }

    if (currentLevel === "root") {
      setSelectedClientId(item.id)
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name, type: "client" }])
      setCurrentLevel("client")
    } else if (currentLevel === "client") {
      setSelectedProjectId(item.id)
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name, type: "project" }])
      setCurrentLevel("project")
    }
  }

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    const target = newBreadcrumbs[newBreadcrumbs.length - 1]
    setBreadcrumbs(newBreadcrumbs)
    setCurrentLevel(target.type)

    if (target.type === "root") {
      setSelectedClientId(null)
      setSelectedProjectId(null)
    } else if (target.type === "client") {
      setSelectedClientId(target.id)
      setSelectedProjectId(null)
    }
  }

  // Sort items
  const sortItems = (items: FolderItem[]): FolderItem[] => {
    const folders = items.filter((item) => item.type === "folder")
    const creativesItems = items.filter((item) => item.type === "creative")

    const sortFn = (a: FolderItem, b: FolderItem) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "date":
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          break
        case "type":
          comparison = (a.projectType || a.creativeType || "").localeCompare(b.projectType || b.creativeType || "")
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    }

    return [...folders.sort(sortFn), ...creativesItems.sort(sortFn)]
  }

  const filteredItems = sortItems(
    getCurrentItems().filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
          {/* Breadcrumb Title */}
          <nav className="flex items-center gap-1 flex-wrap">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-muted-foreground">/</span>
                )}
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={cn(
                    "text-lg font-bold transition-colors hover:text-[#5C6ECD]",
                    index === breadcrumbs.length - 1
                      ? "text-[#5C6ECD]"
                      : "text-foreground"
                  )}
                >
                  {index === 0 ? `Master Drive${organizationName ? ` for ${organizationName}` : ""}` : crumb.name}
                </button>
              </div>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Filter & Sort Dropdown */}
            <div className="relative" ref={filterMenuRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                  showFilterMenu || sortBy !== "name"
                    ? "border-[#5C6ECD] bg-[#5C6ECD]/5 text-[#5C6ECD]"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <Filter className="w-4 h-4" />
                Sort
                {sortBy !== "name" && (
                  <span className="w-2 h-2 rounded-full bg-[#5C6ECD]" />
                )}
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
                    <div className="space-y-1">
                      {[
                        { value: "name", label: "Name", icon: ArrowUpDown },
                        { value: "date", label: "Date", icon: Clock },
                        { value: "type", label: "Type", icon: File },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            if (sortBy === option.value) {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            } else {
                              setSortBy(option.value as SortBy)
                              setSortOrder("asc")
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                            sortBy === option.value
                              ? "bg-[#5C6ECD]/10 text-[#5C6ECD]"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <option.icon className="w-3.5 h-3.5" />
                          {option.label}
                          {sortBy === option.value && (
                            <span className="ml-auto text-xs">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sortBy !== "name" && (
                    <div className="p-3 border-t border-border">
                      <button
                        onClick={() => {
                          setSortBy("name")
                          setSortOrder("asc")
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-56 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-all text-sm"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg p-1 bg-muted/30">
              <button
                onClick={() => setViewType("grid")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewType === "grid"
                    ? "bg-[#5C6ECD] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewType("list")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewType === "list"
                    ? "bg-[#5C6ECD] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative rounded-2xl border-2 border-dashed min-h-[400px] p-6 border-border">
          {/* Content */}
          {isLoading ? (
            currentLevel === "project" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <CreativeCardSkeleton key={i} />
                ))}
              </div>
            ) : viewType === "grid" ? (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {[...Array(8)].map((_, i) => (
                  <FolderGridSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div>
                {[...Array(5)].map((_, i) => (
                  <FolderListSkeleton key={i} />
                ))}
              </div>
            )
          ) : currentLevel === "project" ? (
            // Creatives View - Cards that open in Revue
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => (
                <CreativeCard
                  key={item.id}
                  item={item}
                  index={index}
                  onClick={() => navigateToFolder(item)}
                />
              ))}
            </div>
          ) : viewType === "grid" ? (
            // Grid View
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {filteredItems.map((item, index) => (
                <FolderCard
                  key={item.id}
                  item={item}
                  index={index}
                  onClick={() => navigateToFolder(item)}
                />
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-0.5">
              {/* List Header */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-2">
                <div className="w-8" />
                <span className="flex-1">Name</span>
                <span className="w-24 text-center">Type</span>
                <span className="w-28 text-right">
                  {currentLevel === "root" ? "Projects" : "Items"}
                </span>
              </div>

              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => navigateToFolder(item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                  style={{ animationDelay: `${index * 20}ms`, animationFillMode: "backwards" }}
                >
                  {item.logoUrl ? (
                    <img
                      src={item.logoUrl}
                      alt={item.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <FolderIcon className="w-8 h-7 shrink-0" />
                  )}
                  <span className="font-medium text-foreground text-sm flex-1 truncate">{item.name}</span>
                  <span className="w-24 text-center text-xs text-muted-foreground">
                    {item.projectType || "Folder"}
                  </span>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {item.itemCount !== undefined ? `${item.itemCount} ${currentLevel === "root" ? "project" : "item"}${item.itemCount !== 1 ? "s" : ""}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderIcon className="w-24 h-20 mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {currentLevel === "root"
                  ? "No clients yet"
                  : currentLevel === "client"
                  ? "No projects for this client"
                  : "No creatives in this project"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : currentLevel === "root"
                  ? "Add clients from the Studio to see them here"
                  : currentLevel === "client"
                  ? "Create a project brief to get started"
                  : "Add creatives to this project from the Room"}
              </p>
            </div>
          )}
        </div>

        {/* Footer count */}
        {!isLoading && filteredItems.length > 0 && (
          <p className="text-xs text-foreground/40 mt-3 px-1">
            {filteredItems.length} {currentLevel === "root" ? "client" : currentLevel === "client" ? "project" : "creative"}{filteredItems.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </main>
  )
}

// Folder Card Component (for clients and projects)
function FolderCard({
  item,
  index,
  onClick,
}: {
  item: FolderItem
  index: number
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center p-2 rounded-lg transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-4 hover:bg-[#5C6ECD]/5"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
    >
      {item.logoUrl ? (
        <div className="mb-1.5 group-hover:scale-105 transition-transform duration-200">
          <img
            src={item.logoUrl}
            alt={item.name}
            className="w-14 h-14 rounded-xl object-cover border border-border"
          />
        </div>
      ) : (
        <div className="mb-1.5 group-hover:scale-105 transition-transform duration-200">
          <FolderIcon className="w-14 h-12 drop-shadow-sm group-hover:drop-shadow-md" />
        </div>
      )}
      <span className="text-xs font-medium text-foreground text-center line-clamp-2 group-hover:text-[#5C6ECD] transition-colors max-w-full px-1">
        {item.name}
      </span>
      {item.itemCount !== undefined && (
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
        </span>
      )}
    </div>
  )
}

// Creative Card Component (for creatives inside a project)
function CreativeCard({
  item,
  index,
  onClick,
}: {
  item: FolderItem
  index: number
  onClick: () => void
}) {
  const statusLabel = statusLabels[item.status || ""] || item.status || "In Progress"
  const statusDot = statusColors[item.status || ""] || "bg-blue-500"

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-[#5C6ECD]/30 hover:shadow-lg hover:shadow-[#5C6ECD]/5 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 cursor-pointer"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      {/* Preview Area */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5C6ECD]/5 to-[#5C6ECD]/10">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium">
            <ExternalLink className="w-4 h-4" />
            Open in Revue
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-[10px] font-medium uppercase">
          {item.creativeType || "design"}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-2 truncate group-hover:text-[#5C6ECD] transition-colors" title={item.name}>
          {item.name}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">v{item.iteration}</span>
          </div>
        </div>

        {item.createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full border-[#5C6ECD]/30 text-[#5C6ECD] hover:bg-[#5C6ECD] hover:text-white hover:border-[#5C6ECD] transition-all font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-2" />
          OPEN IN REVUE
        </Button>
      </div>
    </div>
  )
}
