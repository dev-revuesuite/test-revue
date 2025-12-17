"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Upload,
  Grid3X3,
  List,
  Search,
  MoreHorizontal,
  Eye,
  Download,
  Image as ImageIcon,
  FileText,
  Film,
  File,
  User,
  Calendar,
  X,
  Music,
  Play,
  Pause,
  Volume2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Check,
  Clock,
  HardDrive
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface MasterDriveContentProps {
  user: {
    name: string
    email: string
    avatar: string
  }
}

// Types
type ViewType = "grid" | "list"
type FolderType = "root" | "client" | "project" | "creative" | "iteration"
type SortBy = "name" | "date" | "size" | "type"
type SortOrder = "asc" | "desc"
type FilterType = "all" | "image" | "video" | "audio" | "document" | "other"

interface BreadcrumbItem {
  id: string
  name: string
  type: FolderType
}

interface FolderItem {
  id: string
  name: string
  type: "folder" | "file"
  fileType?: "image" | "video" | "document" | "audio" | "other"
  createdAt: string
  updatedAt: string
  itemCount?: number
  thumbnail?: string
  uploadedBy?: string
  iteration?: number
  fileUrl?: string
  fileSize?: number
}

interface UploadedFile {
  id: string
  name: string
  type: "file"
  fileType: "image" | "video" | "document" | "audio" | "other"
  fileUrl: string
  thumbnail?: string
  createdAt: string
  updatedAt: string
  uploadedBy: string
  fileSize: number
}

// Mock data
const mockClients: FolderItem[] = [
  { id: "1", name: "TechVision Labs", type: "folder", createdAt: "2024-12-01", updatedAt: "2024-12-15", itemCount: 5 },
  { id: "2", name: "Starter Inc", type: "folder", createdAt: "2024-11-20", updatedAt: "2024-12-14", itemCount: 3 },
  { id: "3", name: "CloudNine SaaS", type: "folder", createdAt: "2024-11-15", updatedAt: "2024-12-13", itemCount: 8 },
  { id: "4", name: "FinanceFlow", type: "folder", createdAt: "2024-10-28", updatedAt: "2024-12-12", itemCount: 12 },
  { id: "5", name: "GreenLeaf Co", type: "folder", createdAt: "2024-10-15", updatedAt: "2024-12-10", itemCount: 4 },
  { id: "6", name: "Urban Eats", type: "folder", createdAt: "2024-09-20", updatedAt: "2024-12-08", itemCount: 6 },
  { id: "7", name: "MediaPulse", type: "folder", createdAt: "2024-09-01", updatedAt: "2024-12-05", itemCount: 9 },
]

const mockProjects: FolderItem[] = [
  { id: "p1", name: "Brand Refresh 2024", type: "folder", createdAt: "2024-12-01", updatedAt: "2024-12-15", itemCount: 8 },
  { id: "p2", name: "Social Media Campaign", type: "folder", createdAt: "2024-11-15", updatedAt: "2024-12-14", itemCount: 15 },
  { id: "p3", name: "Website Redesign", type: "folder", createdAt: "2024-10-20", updatedAt: "2024-12-12", itemCount: 23 },
  { id: "p4", name: "Product Launch", type: "folder", createdAt: "2024-10-01", updatedAt: "2024-12-10", itemCount: 11 },
]

const mockCreatives: FolderItem[] = [
  { id: "c1", name: "Hero Banner", type: "folder", createdAt: "2024-12-10", updatedAt: "2024-12-15", itemCount: 5 },
  { id: "c2", name: "Instagram Posts", type: "folder", createdAt: "2024-12-08", updatedAt: "2024-12-14", itemCount: 12 },
  { id: "c3", name: "Email Templates", type: "folder", createdAt: "2024-12-05", updatedAt: "2024-12-13", itemCount: 4 },
  { id: "c4", name: "Logo Variations", type: "folder", createdAt: "2024-12-01", updatedAt: "2024-12-12", itemCount: 8 },
  { id: "c5", name: "Video Ads", type: "folder", createdAt: "2024-11-28", updatedAt: "2024-12-10", itemCount: 3 },
]

const mockIterations: FolderItem[] = [
  { id: "i1", name: "Iteration 5", type: "file", fileType: "image", iteration: 5, createdAt: "2024-12-15", updatedAt: "2024-12-15", uploadedBy: "Pranav Jain", thumbnail: "" },
  { id: "i2", name: "Iteration 4", type: "file", fileType: "image", iteration: 4, createdAt: "2024-12-14", updatedAt: "2024-12-14", uploadedBy: "Pranav Jain", thumbnail: "" },
  { id: "i3", name: "Iteration 3", type: "file", fileType: "image", iteration: 3, createdAt: "2024-12-12", updatedAt: "2024-12-12", uploadedBy: "Pranav Jain", thumbnail: "" },
  { id: "i4", name: "Iteration 2", type: "file", fileType: "image", iteration: 2, createdAt: "2024-12-10", updatedAt: "2024-12-10", uploadedBy: "Aashish Soni", thumbnail: "" },
]

const mockProjectFiles: FolderItem[] = [
  { id: "f1", name: "Brand Guidelines.pdf", type: "file", fileType: "document", createdAt: "2024-12-15", updatedAt: "2024-12-15", uploadedBy: "Pranav Jain" },
  { id: "f2", name: "Reference Images.zip", type: "file", fileType: "other", createdAt: "2024-12-14", updatedAt: "2024-12-14", uploadedBy: "Aashish Soni" },
  { id: "f3", name: "Mood Board.png", type: "file", fileType: "image", createdAt: "2024-12-12", updatedAt: "2024-12-12", uploadedBy: "Pranav Jain" },
]

// macOS Style Folder Icon Component
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 52" fill="none" className={className}>
      {/* Shadow */}
      <ellipse cx="32" cy="49" rx="26" ry="3" fill="black" fillOpacity="0.1" />
      {/* Back tab */}
      <path
        d="M4 10C4 7.79086 5.79086 6 8 6H22L26 10H56C58.2091 10 60 11.7909 60 14V14H4V10Z"
        fill="#5AB2F6"
      />
      {/* Main folder body */}
      <path
        d="M2 14C2 12.8954 2.89543 12 4 12H60C61.1046 12 62 12.8954 62 14V44C62 45.1046 61.1046 46 60 46H4C2.89543 46 2 45.1046 2 44V14Z"
        fill="url(#macFolderGradient)"
      />
      {/* Top highlight */}
      <path
        d="M2 14C2 12.8954 2.89543 12 4 12H60C61.1046 12 62 12.8954 62 14V16H2V14Z"
        fill="white"
        fillOpacity="0.3"
      />
      {/* Bottom shadow */}
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

function IterationCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-8 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
        </div>
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    </div>
  )
}

// Helper function to determine file type
function getFileTypeFromMime(mimeType: string): "image" | "video" | "document" | "audio" | "other" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf" || mimeType.includes("document") || mimeType.includes("text")) return "document"
  return "other"
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Preview Modal Component
function PreviewModal({
  file,
  onClose,
  files,
  currentIndex,
  onNavigate
}: {
  file: FolderItem | UploadedFile | null
  onClose: () => void
  files?: (FolderItem | UploadedFile)[]
  currentIndex?: number
  onNavigate?: (direction: "prev" | "next") => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && onNavigate) onNavigate("prev")
      if (e.key === "ArrowRight" && onNavigate) onNavigate("next")
      if (e.key === " " && (file?.fileType === "video" || file?.fileType === "audio")) {
        e.preventDefault()
        togglePlayPause()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, onNavigate, file])

  const togglePlayPause = () => {
    const mediaRef = file?.fileType === "video" ? videoRef : audioRef
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause()
      } else {
        mediaRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    const mediaRef = file?.fileType === "video" ? videoRef : audioRef
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    const mediaRef = file?.fileType === "video" ? videoRef : audioRef
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration)
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!file) return null

  const canNavigate = files && files.length > 1 && onNavigate

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 max-w-5xl max-h-[90vh] w-full mx-4 animate-in zoom-in-95 fade-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* File Name */}
        <div className="absolute -top-12 left-0 text-white font-medium truncate max-w-[calc(100%-60px)]">
          {file.name}
          {file.fileSize && (
            <span className="ml-2 text-white/60 text-sm">({formatFileSize(file.fileSize)})</span>
          )}
        </div>

        {/* Navigation Arrows */}
        {canNavigate && (
          <>
            <button
              onClick={() => onNavigate("prev")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => onNavigate("next")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Preview Content */}
        <div className="bg-card rounded-xl overflow-hidden shadow-2xl">
          {/* Image Preview */}
          {file.fileType === "image" && (
            <div className="flex items-center justify-center bg-black/50 min-h-[400px] max-h-[80vh]">
              <img
                src={file.fileUrl || file.thumbnail || ""}
                alt={file.name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          )}

          {/* Video Preview */}
          {file.fileType === "video" && (
            <div className="bg-black">
              <video
                ref={videoRef}
                src={file.fileUrl}
                className="w-full max-h-[70vh]"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
              {/* Video Controls */}
              <div className="p-4 bg-gradient-to-t from-black/80 to-transparent -mt-20 relative">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlayPause}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value)
                        if (videoRef.current) {
                          videoRef.current.currentTime = time
                        }
                      }}
                      className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                  <span className="text-white/80 text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Audio Preview */}
          {file.fileType === "audio" && (
            <div className="p-8 bg-gradient-to-br from-[#5C6ECD]/20 to-[#4A5BC7]/20">
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-[#5C6ECD]/20 flex items-center justify-center">
                  <Music className="w-16 h-16 text-[#5C6ECD]" />
                </div>
                <audio
                  ref={audioRef}
                  src={file.fileUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="p-4 rounded-full bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white transition-colors shadow-lg"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          const time = parseFloat(e.target.value)
                          if (audioRef.current) {
                            audioRef.current.currentTime = time
                          }
                        }}
                        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#5C6ECD] [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PDF Preview */}
          {file.fileType === "document" && (
            <div className="h-[80vh]">
              <iframe
                src={file.fileUrl}
                className="w-full h-full"
                title={file.name}
              />
            </div>
          )}

          {/* Other File Types */}
          {file.fileType === "other" && (
            <div className="p-12 text-center">
              <File className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Preview not available</h3>
              <p className="text-muted-foreground mb-6">This file type cannot be previewed directly.</p>
              <Button className="gap-2 bg-[#5C6ECD] hover:bg-[#4A5BC7]">
                <Download className="w-4 h-4" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* File Counter */}
        {canNavigate && currentIndex !== undefined && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {currentIndex + 1} of {files.length}
          </div>
        )}
      </div>
    </div>
  )
}

export function MasterDriveContent({ user }: MasterDriveContentProps) {
  const [viewType, setViewType] = useState<ViewType>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "Master Drive", type: "root" }
  ])
  const [currentLevel, setCurrentLevel] = useState<FolderType>("root")
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [previewFile, setPreviewFile] = useState<FolderItem | UploadedFile | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [currentLevel])

  // Handle file upload
  const handleFileUpload = (files: FileList) => {
    setIsUploading(true)
    const newFiles: UploadedFile[] = []

    Array.from(files).forEach((file) => {
      const fileType = getFileTypeFromMime(file.type)
      const fileUrl = URL.createObjectURL(file)

      const newFile: UploadedFile = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: "file",
        fileType,
        fileUrl,
        thumbnail: fileType === "image" ? fileUrl : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: user.name,
        fileSize: file.size,
      }

      newFiles.push(newFile)
    })

    // Simulate upload delay
    setTimeout(() => {
      setUploadedFiles(prev => [...newFiles, ...prev])
      setIsUploading(false)
    }, 1000)
  }

  // Handle preview navigation
  const handlePreviewNavigate = (direction: "prev" | "next") => {
    const previewableFiles = getAllPreviewableFiles()
    let newIndex = previewIndex

    if (direction === "prev") {
      newIndex = previewIndex > 0 ? previewIndex - 1 : previewableFiles.length - 1
    } else {
      newIndex = previewIndex < previewableFiles.length - 1 ? previewIndex + 1 : 0
    }

    setPreviewIndex(newIndex)
    setPreviewFile(previewableFiles[newIndex])
  }

  // Get all previewable files (files, not folders)
  const getAllPreviewableFiles = (): (FolderItem | UploadedFile)[] => {
    const files = filteredItems.filter(item => item.type === "file")
    return [...sortedUploadedFiles, ...files]
  }

  // Open preview
  const openPreview = (file: FolderItem | UploadedFile) => {
    const previewableFiles = getAllPreviewableFiles()
    const index = previewableFiles.findIndex(f => f.id === file.id)
    setPreviewIndex(index >= 0 ? index : 0)
    setPreviewFile(file)
  }

  const getCurrentItems = (): FolderItem[] => {
    switch (currentLevel) {
      case "root":
        return mockClients
      case "client":
        return mockProjects
      case "project":
        return [...mockCreatives, ...mockProjectFiles]
      case "creative":
        return mockIterations
      default:
        return []
    }
  }

  const navigateToFolder = (item: FolderItem) => {
    if (item.type !== "folder") return

    let newType: FolderType = "root"
    switch (currentLevel) {
      case "root":
        newType = "client"
        break
      case "client":
        newType = "project"
        break
      case "project":
        newType = "creative"
        break
      case "creative":
        newType = "iteration"
        break
    }

    setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name, type: newType }])
    setCurrentLevel(newType)
  }

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newBreadcrumbs)
    setCurrentLevel(newBreadcrumbs[newBreadcrumbs.length - 1].type)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && (currentLevel === "project" || currentLevel === "creative")) {
      handleFileUpload(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Sort and filter items - folders first, then files
  const sortAndFilterItems = (items: FolderItem[]): FolderItem[] => {
    // Separate folders and files
    const folders = items.filter(item => item.type === "folder")
    const files = items.filter(item => item.type === "file")

    // Filter files by type
    const filteredFiles = filterType === "all"
      ? files
      : files.filter(item => item.fileType === filterType)

    // Sort function
    const sortFn = (a: FolderItem, b: FolderItem) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "date":
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case "size":
          comparison = (a.fileSize || 0) - (b.fileSize || 0)
          break
        case "type":
          comparison = (a.fileType || "").localeCompare(b.fileType || "")
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    }

    // Sort folders and files separately, then combine
    const sortedFolders = [...folders].sort(sortFn)
    const sortedFiles = [...filteredFiles].sort(sortFn)

    return [...sortedFolders, ...sortedFiles]
  }

  // Sort uploaded files
  const sortUploadedFiles = (files: UploadedFile[]): UploadedFile[] => {
    // Filter by type
    const filteredFiles = filterType === "all"
      ? files
      : files.filter(file => file.fileType === filterType)

    return [...filteredFiles].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "date":
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case "size":
          comparison = (a.fileSize || 0) - (b.fileSize || 0)
          break
        case "type":
          comparison = a.fileType.localeCompare(b.fileType)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }

  const filteredItems = sortAndFilterItems(
    getCurrentItems().filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const sortedUploadedFiles = sortUploadedFiles(
    uploadedFiles.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case "image":
        return ImageIcon
      case "video":
        return Film
      case "document":
        return FileText
      default:
        return File
    }
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-6">
        {/* Header Row - Breadcrumbs + Search + View Toggle (all inline) */}
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
                  {index === 0 ? `Master Drive for ${user.name}'s Organization` : crumb.name}
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
                  showFilterMenu || filterType !== "all" || sortBy !== "name"
                    ? "border-[#5C6ECD] bg-[#5C6ECD]/5 text-[#5C6ECD]"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <Filter className="w-4 h-4" />
                Filter
                {(filterType !== "all" || sortBy !== "name") && (
                  <span className="w-2 h-2 rounded-full bg-[#5C6ECD]" />
                )}
              </button>

              {/* Filter Menu */}
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Sort By Section */}
                  <div className="p-3 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "name", label: "Name", icon: ArrowUpDown },
                        { value: "date", label: "Date", icon: Clock },
                        { value: "size", label: "Size", icon: HardDrive },
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
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
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

                  {/* Filter By Type Section */}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">File Type</p>
                    <div className="space-y-1">
                      {[
                        { value: "all", label: "All Files", icon: File },
                        { value: "image", label: "Images", icon: ImageIcon },
                        { value: "video", label: "Videos", icon: Film },
                        { value: "audio", label: "Audio", icon: Music },
                        { value: "document", label: "Documents", icon: FileText },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFilterType(option.value as FilterType)}
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                            filterType === option.value
                              ? "bg-[#5C6ECD]/10 text-[#5C6ECD]"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <option.icon className="w-3.5 h-3.5" />
                          {option.label}
                          {filterType === option.value && (
                            <Check className="w-3.5 h-3.5 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Button */}
                  {(filterType !== "all" || sortBy !== "name") && (
                    <div className="p-3 border-t border-border">
                      <button
                        onClick={() => {
                          setFilterType("all")
                          setSortBy("name")
                          setSortOrder("asc")
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Reset Filters
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

            {/* Upload Button */}
            {(currentLevel === "project" || currentLevel === "creative") && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area with Border */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed min-h-[400px] p-6 transition-all duration-200",
            isDragging
              ? "border-[#5C6ECD] bg-[#5C6ECD]/5"
              : "border-border"
          )}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#5C6ECD]/5 rounded-2xl z-10">
              <div className="text-center">
                <Upload className="w-12 h-12 text-[#5C6ECD] mx-auto mb-3" />
                <p className="text-lg font-medium text-[#5C6ECD]">Drop files here to upload</p>
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            // Skeleton Loading
            currentLevel === "creative" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <IterationCardSkeleton key={i} />
                ))}
              </div>
            ) : viewType === "grid" ? (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {[...Array(10)].map((_, i) => (
                  <FolderGridSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div>
                {[...Array(7)].map((_, i) => (
                  <FolderListSkeleton key={i} />
                ))}
              </div>
            )
          ) : currentLevel === "creative" ? (
            // Iterations View - Show uploaded files as cards too
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Uploaded Files */}
              {sortedUploadedFiles.map((file, index) => (
                <UploadedFileCard
                  key={file.id}
                  file={file}
                  index={index}
                  onPreview={() => openPreview(file)}
                  getFileIcon={getFileIcon}
                />
              ))}
              {/* Existing Items */}
              {filteredItems.map((item, index) => (
                <IterationCard
                  key={item.id}
                  item={item}
                  index={sortedUploadedFiles.length + index}
                  onPreview={() => item.type === "file" && openPreview(item)}
                />
              ))}
            </div>
          ) : viewType === "grid" ? (
            // Grid View - Tighter spacing
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {/* Folders first, then uploaded files, then existing files */}
              {filteredItems.filter(item => item.type === "folder").map((item, index) => (
                <FolderCard
                  key={item.id}
                  item={item}
                  index={index}
                  onClick={() => navigateToFolder(item)}
                  getFileIcon={getFileIcon}
                />
              ))}
              {/* Uploaded Files in Grid */}
              {currentLevel === "project" && sortedUploadedFiles.map((file, index) => (
                <FolderCard
                  key={file.id}
                  item={file}
                  index={filteredItems.filter(i => i.type === "folder").length + index}
                  onClick={() => openPreview(file)}
                  getFileIcon={getFileIcon}
                />
              ))}
              {/* Existing Files */}
              {filteredItems.filter(item => item.type === "file").map((item, index) => (
                <FolderCard
                  key={item.id}
                  item={item}
                  index={filteredItems.filter(i => i.type === "folder").length + (currentLevel === "project" ? sortedUploadedFiles.length : 0) + index}
                  onClick={() => openPreview(item)}
                  getFileIcon={getFileIcon}
                />
              ))}
            </div>
          ) : (
            // List View - With date and type columns
            <div className="space-y-0.5">
              {/* List Header */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-2">
                <div className="w-8" /> {/* Icon space */}
                <span className="flex-1">Name</span>
                <span className="w-24 text-center">Type</span>
                <span className="w-28 text-right">Modified</span>
                <span className="w-20 text-right">Size</span>
              </div>

              {/* Folders first */}
              {filteredItems.filter(item => item.type === "folder").map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => navigateToFolder(item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                  style={{ animationDelay: `${index * 20}ms`, animationFillMode: "backwards" }}
                >
                  <FolderIcon className="w-8 h-7 shrink-0" />
                  <span className="font-medium text-foreground text-sm flex-1 truncate">{item.name}</span>
                  <span className="w-24 text-center text-xs text-muted-foreground">Folder</span>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {item.itemCount ? `${item.itemCount} items` : "—"}
                  </span>
                </div>
              ))}

              {/* Uploaded Files in List */}
              {currentLevel === "project" && sortedUploadedFiles.map((file, index) => (
                <div
                  key={file.id}
                  onClick={() => openPreview(file)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                  style={{ animationDelay: `${(filteredItems.filter(i => i.type === "folder").length + index) * 20}ms`, animationFillMode: "backwards" }}
                >
                  {file.fileType === "image" && file.thumbnail ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border">
                      <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {(() => {
                        const Icon = getFileIcon(file.fileType)
                        return <Icon className="w-4 h-4 text-muted-foreground" />
                      })()}
                    </div>
                  )}
                  <span className="font-medium text-foreground text-sm flex-1 truncate">{file.name}</span>
                  <span className="w-24 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium capitalize",
                      file.fileType === "image" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      file.fileType === "video" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                      file.fileType === "audio" && "bg-green-500/10 text-green-600 dark:text-green-400",
                      file.fileType === "document" && "bg-red-500/10 text-red-600 dark:text-red-400",
                      file.fileType === "other" && "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    )}>
                      {file.fileType}
                    </span>
                  </span>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {new Date(file.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                </div>
              ))}

              {/* Existing Files in List */}
              {filteredItems.filter(item => item.type === "file").map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => openPreview(item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                  style={{ animationDelay: `${(filteredItems.filter(i => i.type === "folder").length + (currentLevel === "project" ? sortedUploadedFiles.length : 0) + index) * 20}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = getFileIcon(item.fileType)
                      return <Icon className="w-4 h-4 text-muted-foreground" />
                    })()}
                  </div>
                  <span className="font-medium text-foreground text-sm flex-1 truncate">{item.name}</span>
                  <span className="w-24 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium capitalize",
                      item.fileType === "image" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      item.fileType === "video" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                      item.fileType === "audio" && "bg-green-500/10 text-green-600 dark:text-green-400",
                      item.fileType === "document" && "bg-red-500/10 text-red-600 dark:text-red-400",
                      item.fileType === "other" && "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    )}>
                      {item.fileType || "file"}
                    </span>
                  </span>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {item.fileSize ? formatFileSize(item.fileSize) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredItems.length === 0 && sortedUploadedFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderIcon className="w-24 h-20 mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "This folder is empty"}
              </p>
              {(currentLevel === "project" || currentLevel === "creative") && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 gap-2 bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          files={getAllPreviewableFiles()}
          currentIndex={previewIndex}
          onNavigate={handlePreviewNavigate}
        />
      )}
    </main>
  )
}

// Folder Card Component
function FolderCard({
  item,
  index,
  onClick,
  getFileIcon
}: {
  item: FolderItem | UploadedFile
  index: number
  onClick: () => void
  getFileIcon: (fileType?: string) => typeof File
}) {
  const isUploadedFile = "fileUrl" in item && item.fileUrl
  const hasImageThumbnail = item.fileType === "image" && (item.thumbnail || (isUploadedFile && item.fileUrl))

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center p-2 rounded-lg transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
        item.type === "folder"
          ? "hover:bg-[#5C6ECD]/5"
          : "hover:bg-muted/50"
      )}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
    >
      {item.type === "folder" ? (
        <div className="mb-1.5 group-hover:scale-105 transition-transform duration-200">
          <FolderIcon className="w-14 h-12 drop-shadow-sm group-hover:drop-shadow-md" />
        </div>
      ) : hasImageThumbnail ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden mb-1.5 group-hover:scale-105 transition-transform duration-200 border border-border">
          <img
            src={item.thumbnail || item.fileUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-1.5 group-hover:bg-muted/80 transition-colors">
          {(() => {
            const Icon = getFileIcon(item.fileType)
            return <Icon className="w-6 h-6 text-muted-foreground" />
          })()}
        </div>
      )}
      <span className="text-xs font-medium text-foreground text-center line-clamp-2 group-hover:text-[#5C6ECD] transition-colors max-w-full px-1">
        {item.name}
      </span>
    </div>
  )
}

// Iteration Card Component
function IterationCard({ item, index, onPreview }: { item: FolderItem; index: number; onPreview?: () => void }) {
  return (
    <div
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-[#5C6ECD]/30 hover:shadow-lg hover:shadow-[#5C6ECD]/5 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      {/* Preview Area */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden cursor-pointer" onClick={onPreview}>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <Eye className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Iteration</h3>
          <span className="text-lg font-bold text-[#5C6ECD]">{item.iteration}</span>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Uploaded by
            </span>
            <span className="font-medium text-foreground">{item.uploadedBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Uploaded on
            </span>
            <span className="font-medium text-foreground">
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        <Button
          onClick={onPreview}
          variant="outline"
          className="w-full border-[#5C6ECD]/30 text-[#5C6ECD] hover:bg-[#5C6ECD] hover:text-white hover:border-[#5C6ECD] transition-all font-medium"
        >
          VIEW ITERATION
        </Button>
      </div>
    </div>
  )
}

// Uploaded File Card Component (for iteration view)
function UploadedFileCard({
  file,
  index,
  onPreview,
  getFileIcon
}: {
  file: UploadedFile
  index: number
  onPreview: () => void
  getFileIcon: (fileType?: string) => typeof File
}) {
  return (
    <div
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-[#5C6ECD]/30 hover:shadow-lg hover:shadow-[#5C6ECD]/5 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      {/* Preview Area */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden cursor-pointer" onClick={onPreview}>
        {file.fileType === "image" && file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : file.fileType === "video" ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        ) : file.fileType === "audio" ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5C6ECD]/20 to-[#4A5BC7]/20">
            <Music className="w-16 h-16 text-[#5C6ECD]" />
          </div>
        ) : file.fileType === "document" ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-orange-500/10">
            <FileText className="w-16 h-16 text-red-500/60" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {(() => {
              const Icon = getFileIcon(file.fileType)
              return <Icon className="w-16 h-16 text-muted-foreground/30" />
            })()}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <Eye className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* File Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium uppercase">
          {file.fileType}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-3 truncate" title={file.name}>
          {file.name}
        </h3>

        <div className="space-y-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Uploaded by
            </span>
            <span className="font-medium text-foreground">{file.uploadedBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Uploaded on
            </span>
            <span className="font-medium text-foreground">
              {new Date(file.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Size</span>
            <span className="font-medium text-foreground">{formatFileSize(file.fileSize)}</span>
          </div>
        </div>

        <Button
          onClick={onPreview}
          variant="outline"
          className="w-full border-[#5C6ECD]/30 text-[#5C6ECD] hover:bg-[#5C6ECD] hover:text-white hover:border-[#5C6ECD] transition-all font-medium"
        >
          VIEW FILE
        </Button>
      </div>
    </div>
  )
}
