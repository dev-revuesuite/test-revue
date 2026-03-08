"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronDown,
  Check,
  Plus,
  Upload,
  X,
  Info,
  Trash2,
  ArrowRight,
  Search,
  Sparkles,
  Zap,
  CalendarIcon,
  ExternalLink as LinkIcon,
  Globe,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

// Types
interface DeliverableItem {
  id: string
  name: string
  date: string
}

interface Reference {
  id: string
  name: string
  type: "file" | "link"
  files?: File[]
}

interface NamingColumn {
  id: string
  value: string
}

interface BriefFormData {
  // Step 1: Brand Information
  projectName: string
  description: string
  clientName: string
  projectType: string
  // Step 2: Timeline & Milestone
  startDate: string
  endDate: string
  deliverables: DeliverableItem[]
  // Step 3: Team & Settings
  accountManager: string
  teamMemberIds: string[]
  autoDeleteIteration: string
  needQCTool: boolean
  workmode: "productive" | "creative"
  // Step 4: Resources
  references: Reference[]
  namingColumns: NamingColumn[]
  otherDescription: string
}

// Data
const projectTypes = [
  "UI Designing",
  "UX Research",
  "Web Development",
  "Mobile App",
  "Branding",
  "Logo Design",
  "Marketing",
  "Video Production",
  "Social Media",
  "Motion Graphics",
  "Illustration",
  "Print Design",
  "Packaging",
  "Other",
]

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

const deleteIterationOptions = [
  "15 Days",
  "30 Days",
  "60 Days",
]

const namingOptions = [
  "Brand Name",
  "Project Name",
  "Date",
  "Version",
  "Client Name",
  "File Type",
  "Status"
]

// Validation helpers
interface BriefFormErrors {
  projectName?: string
  clientName?: string
  startDate?: string
  endDate?: string
  accountManager?: string
}

// ── Standalone RichDropdown (own search state, no focus issues) ──
function RichDropdownStandalone({
  id,
  value,
  members,
  placeholder,
  onChange,
  showRole = false,
  className = "",
  error,
}: {
  id: string
  value: string
  members: TeamMember[]
  placeholder: string
  onChange: (value: string) => void
  showRole?: boolean
  className?: string
  error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const selectedMember = members.find(m => m.name === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn("relative", className)} style={{ zIndex: isOpen ? 9999 : 30 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors",
          isOpen
            ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-[#1a1a1a]"
            : error
            ? "border-red-500 bg-white dark:bg-[#1a1a1a]"
            : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] hover:border-[#5C6ECD]"
        )}
      >
        {selectedMember ? (
          <>
            {selectedMember.avatar ? (
              <img src={selectedMember.avatar} alt="" className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-[#5C6ECD] flex items-center justify-center rounded-full shrink-0">
                <span className="text-white text-xs font-bold">{selectedMember.name.substring(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{selectedMember.name}</p>
              {selectedMember.email && <p className="text-xs text-[#666] truncate">{selectedMember.email}</p>}
            </div>
          </>
        ) : (
          <span className="flex-1 text-[#999]">{placeholder}</span>
        )}
        <ChevronDown className={cn(
          "w-5 h-5 text-[#999] transition-transform shrink-0",
          isOpen && "rotate-180 text-[#5C6ECD]"
        )} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
          <div className="p-2.5 border-b border-[#e5e5e5] dark:border-[#444]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#444] rounded-lg bg-[#f9f9f9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] transition-colors"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-auto p-1.5">
            {filteredMembers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#999] text-center">No results found</div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    onChange(member.name)
                    setIsOpen(false)
                    setSearchQuery("")
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-[#5C6ECD]/10 transition-colors",
                    value === member.name && "bg-[#5C6ECD]/10"
                  )}
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-[#5C6ECD] flex items-center justify-center rounded-full shrink-0">
                      <span className="text-white text-xs font-bold">{member.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      value === member.name ? "font-medium text-[#5C6ECD]" : "text-[#1a1a1a] dark:text-white"
                    )}>{member.name}</p>
                    <p className="text-xs text-[#666] truncate">
                      {showRole && member.role ? member.role : member.email}
                    </p>
                  </div>
                  {value === member.name && <Check className="w-4 h-4 text-[#5C6ECD] shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

// ── Mini modal overlay (centered) ──
function MiniModal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={cn("w-full mx-4 bg-white dark:bg-[#111] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#333] overflow-hidden", width)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5] dark:border-[#333]">
          <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f0f0f0] dark:hover:bg-[#333] transition-colors">
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface NewBriefDialogProps {
  open: boolean
  onClose: () => void
  onComplete: (data: BriefFormData) => void
  clientDirectory?: { id: string; name: string; logoUrl?: string }[]
  teamMembers?: { id: string; name: string; email: string; avatar: string; role: string }[]
}

export function NewBriefDialog({ open, onClose, onComplete, clientDirectory = [], teamMembers = [] }: NewBriefDialogProps) {
  const [step, setStep] = useState(1)
  const totalSteps = 4
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const teamMembersData: TeamMember[] = teamMembers.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    avatar: m.avatar || undefined,
    role: m.role || undefined,
  }))

  const initialFormData: BriefFormData = {
    projectName: "",
    description: "",
    clientName: "",
    projectType: "UI Designing",
    startDate: "",
    endDate: "",
    deliverables: [],
    accountManager: "",
    teamMemberIds: [],
    autoDeleteIteration: "30 Days",
    needQCTool: false,
    workmode: "productive",
    references: [],
    namingColumns: [
      { id: "1", value: "Brand Name" },
      { id: "2", value: "Project Name" },
      { id: "3", value: "Date" },
      { id: "4", value: "Version" },
    ],
    otherDescription: "",
  }

  const [formData, setFormData] = useState<BriefFormData>(initialFormData)
  const [errors, setErrors] = useState<BriefFormErrors>({})

  // Mini-modal states
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false)
  const [newDeliverableName, setNewDeliverableName] = useState("")
  const [newDeliverableDate, setNewDeliverableDate] = useState("")
  const [addResourceOpen, setAddResourceOpen] = useState(false)
  const [resourceTab, setResourceTab] = useState<"file" | "link">("file")
  const [newLinkName, setNewLinkName] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingLinks, setPendingLinks] = useState<{ name: string; url: string }[]>([])

  const [isCreating, setIsCreating] = useState(false)

  // Dropdown state for CustomDropdown
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFormData(initialFormData)
      setStep(1)
      setErrors({})
      setIsCreating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && !(e.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const clearError = (field: keyof BriefFormErrors) => {
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateStep = (currentStep: number): BriefFormErrors => {
    const newErrors: BriefFormErrors = {}
    if (currentStep === 1) {
      if (!formData.projectName.trim()) newErrors.projectName = "Project name is required"
      if (!formData.clientName.trim()) newErrors.clientName = "Please select a client"
      if (!formData.accountManager) newErrors.accountManager = "Please select a project manager"
    }
    if (currentStep === 2) {
      if (!formData.startDate) newErrors.startDate = "Start date is required"
      if (!formData.endDate) newErrors.endDate = "End date is required"
      if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = "End date must be after start date"
      }
    }
    return newErrors
  }

  const handleNext = () => {
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      setIsCreating(true)
      // Small delay to show animation before calling onComplete
      setTimeout(() => {
        onComplete(formData)
      }, 100)
    }
  }

  const handlePrevious = () => {
    setErrors({})
    if (step > 1) setStep(step - 1)
  }

  const canContinue = () => {
    switch (step) {
      case 1: return formData.projectName.trim() !== "" && formData.clientName.trim() !== "" && formData.accountManager !== ""
      case 2: return formData.startDate !== "" && formData.endDate !== ""
      case 3: return true
      case 4: return true
      default: return true
    }
  }

  const removeDeliverable = (id: string) => {
    setFormData(prev => ({ ...prev, deliverables: prev.deliverables.filter(d => d.id !== id) }))
  }

  const removeReference = (id: string) => {
    setFormData(prev => ({ ...prev, references: prev.references.filter(r => r.id !== id) }))
  }

  const updateNamingColumn = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, namingColumns: prev.namingColumns.map(c => c.id === id ? { ...c, value } : c) }))
  }

  // Custom Dropdown Component
  const CustomDropdown = ({
    id,
    value,
    options,
    placeholder,
    onChange,
    disabled = false,
    className = ""
  }: {
    id: string
    value: string
    options: string[]
    placeholder: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
  }) => (
    <div className={cn("relative dropdown-container", className)} style={{ zIndex: dropdownOpen === id ? 9999 : 30 }}>
      <button
        type="button"
        onClick={() => !disabled && setDropdownOpen(dropdownOpen === id ? null : id)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors",
          disabled
            ? "bg-[#f5f5f5] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#444] cursor-not-allowed"
            : dropdownOpen === id
            ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-[#1a1a1a]"
            : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] hover:border-[#5C6ECD]"
        )}
      >
        <span className={value ? "text-[#1a1a1a] dark:text-white" : "text-[#999]"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-5 h-5 text-[#999] transition-transform", dropdownOpen === id && "rotate-180 text-[#5C6ECD]")} />
      </button>
      {dropdownOpen === id && (
        <div className={cn(
          "absolute left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] rounded-xl shadow-2xl max-h-48 overflow-auto p-1.5",
          className.includes("dropdown-upward") ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )} style={{ zIndex: 99999 }}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setDropdownOpen(null) }}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm rounded-lg hover:bg-[#5C6ECD]/10 transition-colors flex items-center justify-between",
                value === opt && "bg-[#5C6ECD]/10 text-[#5C6ECD]"
              )}
            >
              <span className={value === opt ? "text-[#5C6ECD] font-medium" : "text-[#1a1a1a] dark:text-white"}>{opt}</span>
              {value === opt && <Check className="w-4 h-4 text-[#5C6ECD]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (!open) return null

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90vw] h-[90vh] bg-white dark:bg-[#0a0a0a] flex flex-col shadow-2xl rounded-2xl overflow-hidden">
      {/* Header */}
      <header className="px-8 py-5 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/Logo/Artboard 8@2x.png" alt="Revue" width={120} height={37} className="dark:hidden" />
            <img src="/Logo/Artboard 8 copy@2x.png" alt="Revue" width={120} height={37} className="hidden dark:block" />
          </div>

          <div className="flex items-center gap-6">
            {[
              { num: 1, label: "Brand Information" },
              { num: 2, label: "Timeline & Milestone" },
              { num: 3, label: "Team & Settings" },
              { num: 4, label: "Resources" }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      step > s.num
                        ? "bg-[#5C6ECD] text-white"
                        : step === s.num
                        ? "bg-[#5C6ECD] text-white"
                        : "bg-[#e5e5e5] dark:bg-[#333] text-[#999]"
                    )}
                  >
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={cn("text-sm font-medium transition-colors", step >= s.num ? "text-[#1a1a1a] dark:text-white" : "text-[#999]")}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className={cn("w-12 h-0.5 rounded-full transition-colors", step > s.num ? "bg-[#5C6ECD]" : "bg-[#e5e5e5] dark:bg-[#333]")} />
                )}
              </div>
            ))}
          </div>

          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#999] hover:bg-[#f0f0f0] dark:hover:bg-[#333] hover:text-[#5C6ECD] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Creating Animation Overlay */}
      {isCreating && (
        <div className="absolute inset-0 z-10 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
          {/* Animated rings */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-[#5C6ECD]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-[#5C6ECD]/30 animate-ping" style={{ animationDelay: "0.2s" }} />
            <div className="absolute inset-4 rounded-full border-4 border-[#5C6ECD]/40 animate-ping" style={{ animationDelay: "0.4s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#5C6ECD] to-[#4A5BC7] rounded-full flex items-center justify-center shadow-lg shadow-[#5C6ECD]/30 animate-pulse">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] dark:text-white mb-2 animate-pulse">Creating your brief...</h2>
          <p className="text-sm text-[#666] dark:text-[#999]">Setting up project, uploading resources</p>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-6">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#5C6ECD] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-visible px-8 pt-6 pb-8">
        <div className="w-full max-w-2xl mx-auto">

          {/* Step 1: Brand Information */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">1</span>
                  Brand Information
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">Tell us about the project</h1>
                <p className="text-[#666] dark:text-[#999]">Basic information to get started with your new brief</p>
              </div>

              <div className="space-y-5 overflow-visible">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Project Name <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => { setFormData(prev => ({ ...prev, projectName: e.target.value })); clearError('projectName') }}
                    placeholder="Enter project name"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                      errors.projectName
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                    )}
                  />
                  {errors.projectName && <p className="text-xs text-red-500 mt-1.5">{errors.projectName}</p>}
                </div>

                {/* Client Name + Project Type row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Client Name <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <RichDropdownStandalone
                      id="clientName"
                      value={formData.clientName}
                      members={clientDirectory.map(c => ({ id: c.id, name: c.name, email: "", avatar: c.logoUrl }))}
                      placeholder="Select Client"
                      onChange={(value) => { setFormData(prev => ({ ...prev, clientName: value })); clearError('clientName') }}
                      error={errors.clientName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Project Type <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <CustomDropdown
                      id="projectType"
                      value={formData.projectType}
                      options={projectTypes}
                      placeholder="Select Type"
                      onChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
                    />
                  </div>
                </div>

                {/* Project Manager */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Project Manager <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <RichDropdownStandalone
                    id="accountManager"
                    value={formData.accountManager}
                    members={teamMembersData}
                    placeholder="Select Manager"
                    onChange={(value) => { setFormData(prev => ({ ...prev, accountManager: value })); clearError('accountManager') }}
                    error={errors.accountManager}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the project scope, goals, and any important details..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Timeline & Milestone */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">2</span>
                  Timeline & Milestone
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">Set the timeline</h1>
                <p className="text-[#666] dark:text-[#999]">Define project dates and milestones</p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Date Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Start Date <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12 px-4 rounded-xl bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                            errors.startDate ? "border-red-500" : "border-[#e5e5e5] dark:border-[#444]",
                            !formData.startDate && "text-[#999]"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-[#5C6ECD]" />
                          {formData.startDate ? format(new Date(formData.startDate), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate ? new Date(formData.startDate) : undefined}
                          onSelect={(date) => { setFormData(prev => ({ ...prev, startDate: date ? format(date, "yyyy-MM-dd") : "" })); clearError('startDate') }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.startDate && <p className="text-xs text-red-500 mt-1.5">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      End Date <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12 px-4 rounded-xl bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                            errors.endDate ? "border-red-500" : "border-[#e5e5e5] dark:border-[#444]",
                            !formData.endDate && "text-[#999]"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-[#5C6ECD]" />
                          {formData.endDate ? format(new Date(formData.endDate), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate ? new Date(formData.endDate) : undefined}
                          onSelect={(date) => { setFormData(prev => ({ ...prev, endDate: date ? format(date, "yyyy-MM-dd") : "" })); clearError('endDate') }}
                          disabled={(date) => formData.startDate ? date < new Date(formData.startDate) : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.endDate && <p className="text-xs text-red-500 mt-1.5">{errors.endDate}</p>}
                  </div>
                </div>

                {/* Deliverables */}
                <div className="pt-5 border-t border-[#e5e5e5] dark:border-[#333]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Deliverables</h3>
                    {formData.deliverables.length > 0 && (
                      <span className="text-xs text-[#999] bg-[#f5f5f5] dark:bg-[#222] px-2 py-0.5 rounded-full">{formData.deliverables.length} item{formData.deliverables.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {formData.deliverables.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {formData.deliverables.map((item, index) => (
                        <div key={item.id} className="group flex items-center gap-3 px-4 py-3 border border-[#e5e5e5] dark:border-[#333] rounded-xl hover:border-[#5C6ECD]/30 transition-colors bg-[#fafafa] dark:bg-[#111]">
                          <div className="w-6 h-6 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] shrink-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold">{index + 1}</span>
                          </div>
                          <span className="flex-1 text-sm text-[#1a1a1a] dark:text-white truncate">{item.name}</span>
                          {item.date && (
                            <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD]">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(item.date), "MMM dd")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeDeliverable(item.id)}
                            className="p-1 text-[#ccc] dark:text-[#555] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 py-8 border border-dashed border-[#e5e5e5] dark:border-[#333] rounded-xl text-center">
                      <p className="text-sm text-[#999] mb-1">No deliverables added yet</p>
                      <p className="text-xs text-[#bbb] dark:text-[#555]">Add items that need to be delivered for this project</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setNewDeliverableName(""); setNewDeliverableDate(""); setAddDeliverableOpen(true) }}
                    className="w-full py-2.5 border border-dashed border-[#ccc] dark:border-[#444] rounded-xl text-sm text-[#666] dark:text-[#999] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add deliverable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Team & Settings */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">3</span>
                  Team & Settings
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">Assign the team</h1>
                <p className="text-[#666] dark:text-[#999]">Select team members for this project</p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Team Members as Cards */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Team Members</h3>
                    {formData.teamMemberIds.length > 0 && (
                      <span className="text-xs text-[#5C6ECD] bg-[#5C6ECD]/10 px-2.5 py-0.5 rounded-full font-medium">
                        {formData.teamMemberIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {teamMembersData
                      .filter(m => m.name !== formData.accountManager)
                      .map((member) => {
                        const isSelected = formData.teamMemberIds.includes(member.id)
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                teamMemberIds: isSelected
                                  ? prev.teamMemberIds.filter(id => id !== member.id)
                                  : [...prev.teamMemberIds, member.id]
                              }))
                            }}
                            className={cn(
                              "relative flex items-center gap-3 p-3.5 border-2 rounded-xl text-left transition-all",
                              isSelected
                                ? "border-[#5C6ECD] bg-[#5C6ECD]/5"
                                : "border-[#e5e5e5] dark:border-[#333] hover:border-[#5C6ECD]/40 hover:bg-[#5C6ECD]/[0.02]"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#5C6ECD] flex items-center justify-center rounded-full">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-10 h-10 object-cover rounded-full shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-[#5C6ECD] to-[#4A5BC7] flex items-center justify-center rounded-full shrink-0">
                                <span className="text-white text-xs font-bold">{member.name.substring(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 pr-5">
                              <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{member.name}</p>
                              <p className="text-[11px] text-[#999] truncate">{member.email}</p>
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </div>

                {/* Settings */}
                <div className="pt-5 border-t border-[#e5e5e5] dark:border-[#333]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Auto delete iteration</label>
                      <p className="text-xs text-[#999] mt-0.5">Automatically remove old iterations after</p>
                    </div>
                    <div className="flex gap-1.5 bg-[#f5f5f5] dark:bg-[#222] p-1 rounded-lg">
                      {deleteIterationOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, autoDeleteIteration: opt }))}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            formData.autoDeleteIteration === opt
                              ? "bg-[#5C6ECD] text-white shadow-sm"
                              : "text-[#666] dark:text-[#999] hover:text-[#5C6ECD]"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-[#e5e5e5] dark:border-[#333] rounded-xl hover:border-[#5C6ECD]/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.needQCTool}
                      onChange={(e) => setFormData(prev => ({ ...prev, needQCTool: e.target.checked }))}
                      className="w-4 h-4 border-black dark:border-[#444] text-[#5C6ECD] focus:ring-[#5C6ECD] focus:ring-offset-0 accent-[#5C6ECD] rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[#1a1a1a] dark:text-white">Enable QC Tool</span>
                      <p className="text-xs text-[#999] mt-0.5">Quality check tool for reviewing deliverables</p>
                    </div>
                  </label>
                </div>

                {/* Workmode */}
                <div className="pt-5 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Workmode</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workmode: "productive" }))}
                      className={cn(
                        "relative p-5 border-2 rounded-xl text-left transition-all group",
                        formData.workmode === "productive"
                          ? "border-[#5C6ECD] bg-[#5C6ECD]/5 shadow-lg shadow-[#5C6ECD]/10"
                          : "border-[#e5e5e5] dark:border-[#444] hover:border-[#5C6ECD]/50 hover:bg-[#5C6ECD]/5"
                      )}
                    >
                      {formData.workmode === "productive" && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-[#5C6ECD] flex items-center justify-center rounded-full">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                          formData.workmode === "productive"
                            ? "bg-[#5C6ECD]"
                            : "bg-[#e5e5e5] dark:bg-[#333] group-hover:bg-[#5C6ECD]/20"
                        )}>
                          <Zap className={cn("w-5 h-5 transition-colors", formData.workmode === "productive" ? "text-white" : "text-[#666] group-hover:text-[#5C6ECD]")} />
                        </div>
                        <h4 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Productive</h4>
                      </div>
                      <p className="text-xs text-[#666] dark:text-[#999] leading-relaxed">Structured workflows for deadline-driven projects.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workmode: "creative" }))}
                      className={cn(
                        "relative p-5 border-2 rounded-xl text-left transition-all group overflow-hidden",
                        formData.workmode === "creative"
                          ? "border-transparent bg-gradient-to-br from-[#A259FF] via-[#FF7262] to-[#DBFE52] shadow-lg"
                          : "border-[#e5e5e5] dark:border-[#444] hover:border-[#A259FF]/50"
                      )}
                    >
                      {formData.workmode !== "creative" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#A259FF]/0 via-[#FF7262]/0 to-[#DBFE52]/0 group-hover:from-[#A259FF]/5 group-hover:via-[#FF7262]/5 group-hover:to-[#DBFE52]/5 transition-all rounded-xl" />
                      )}
                      {formData.workmode === "creative" && (
                        <div className="absolute inset-[2px] bg-white dark:bg-[#0a0a0a] rounded-[10px]" />
                      )}
                      <div className="relative">
                        {formData.workmode === "creative" && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#A259FF] to-[#FF7262] flex items-center justify-center rounded-full">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
                            formData.workmode === "creative"
                              ? "bg-gradient-to-br from-[#A259FF] to-[#FF7262]"
                              : "bg-[#e5e5e5] dark:bg-[#333] group-hover:bg-gradient-to-br group-hover:from-[#A259FF]/20 group-hover:to-[#FF7262]/20"
                          )}>
                            <Sparkles className={cn("w-5 h-5 transition-colors", formData.workmode === "creative" ? "text-white" : "text-[#666] group-hover:text-[#A259FF]")} />
                          </div>
                          <h4 className={cn(
                            "text-base font-semibold",
                            formData.workmode === "creative"
                              ? "bg-gradient-to-r from-[#A259FF] to-[#FF7262] bg-clip-text text-transparent"
                              : "text-[#1a1a1a] dark:text-white"
                          )}>Creative</h4>
                        </div>
                        <p className="text-xs text-[#666] dark:text-[#999] leading-relaxed">Flexible exploration for innovative projects.</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Resources */}
          {step === 4 && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">4</span>
                  Resources
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">Add resources</h1>
                <p className="text-[#666] dark:text-[#999]">Upload references and set naming conventions</p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* References */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">References</h3>
                  {formData.references.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {formData.references.map((ref) => (
                        <div key={ref.id} className="group flex items-center gap-3 p-3.5 border border-[#e5e5e5] dark:border-[#333] rounded-xl hover:border-[#5C6ECD]/30 transition-colors bg-[#fafafa] dark:bg-[#111]">
                          <div className={cn(
                            "w-9 h-9 flex items-center justify-center shrink-0 text-white rounded-lg",
                            ref.type === "file" ? "bg-[#5C6ECD]" : "bg-[#10b981]"
                          )}>
                            {ref.type === "file" ? <FileText className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{ref.name || (ref.type === "file" ? "Uploaded files" : "External link")}</p>
                            {ref.type === "file" && ref.files && ref.files.length > 0 && (
                              <p className="text-[11px] text-[#999] truncate">{ref.files.length} file{ref.files.length !== 1 ? "s" : ""}: {ref.files.map(f => f.name).join(", ")}</p>
                            )}
                            {ref.type === "link" && ref.name && (
                              <p className="text-[11px] text-[#999] truncate">{ref.name}</p>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold shrink-0 px-2 py-0.5 rounded-full",
                            ref.type === "file" ? "bg-[#5C6ECD]/10 text-[#5C6ECD]" : "bg-[#10b981]/10 text-[#10b981]"
                          )}>
                            {ref.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeReference(ref.id)}
                            className="p-1 text-[#ccc] dark:text-[#555] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 py-8 border border-dashed border-[#e5e5e5] dark:border-[#333] rounded-xl text-center">
                      <div className="w-10 h-10 bg-[#f5f5f5] dark:bg-[#222] rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5 text-[#999]" />
                      </div>
                      <p className="text-sm text-[#999]">No references added yet</p>
                      <p className="text-xs text-[#bbb] dark:text-[#555] mt-1">Upload files or add external links</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setResourceTab("file"); setNewLinkName(""); setNewLinkUrl(""); setPendingFiles([]); setPendingLinks([]); setAddResourceOpen(true) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-dashed border-[#ccc] dark:border-[#444] rounded-xl text-[#666] dark:text-[#999] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add reference
                  </button>
                </div>

                {/* Naming Convention */}
                <div className="pt-5 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-1">Naming Convention</h3>
                  <p className="text-xs text-[#999] mb-3">Suggested order : Brand Name_Project name_Date_Version</p>
                  <div className="flex items-center gap-1 flex-wrap pb-2">
                    {formData.namingColumns.map((col, index) => (
                      <React.Fragment key={col.id}>
                        <div className="shrink-0 min-w-[120px]">
                          <CustomDropdown
                            id={`naming-${col.id}`}
                            value={col.value}
                            options={namingOptions}
                            placeholder="Select"
                            onChange={(value) => updateNamingColumn(col.id, value)}
                            className="dropdown-upward"
                          />
                        </div>
                        {index < formData.namingColumns.length - 1 && (
                          <span className="text-[#1a1a1a] dark:text-white font-bold text-lg shrink-0 px-1">_</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] dark:border-[#333] px-8 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2.5 font-medium rounded-xl text-[#1a1a1a] dark:text-white border border-[#e5e5e5] dark:border-[#444] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue()}
            className={cn(
              "group flex items-center gap-2 px-8 py-2.5 font-medium rounded-xl transition-all",
              canContinue()
                ? "bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white shadow-lg shadow-[#5C6ECD]/25"
                : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
            )}
          >
            {step === totalSteps ? "Create Brief" : "Continue"}
            <ArrowRight className={cn("w-4 h-4 transition-transform duration-200", canContinue() && "group-hover:translate-x-1")} />
          </button>
        </div>
      </footer>
      </div>
    </div>

    {/* ── Add Deliverable Modal ── */}
    <MiniModal open={addDeliverableOpen} onClose={() => setAddDeliverableOpen(false)} title="Add Deliverable">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-1.5">Name</label>
          <input
            type="text"
            value={newDeliverableName}
            onChange={(e) => setNewDeliverableName(e.target.value)}
            placeholder="e.g. Homepage Design, Logo Concepts..."
            className="w-full px-4 py-3 rounded-xl text-sm border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newDeliverableName.trim()) {
                setFormData(prev => ({ ...prev, deliverables: [...prev.deliverables, { id: Date.now().toString(), name: newDeliverableName.trim(), date: newDeliverableDate }] }))
                setNewDeliverableName(""); setNewDeliverableDate(""); setAddDeliverableOpen(false)
              }
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-1.5">Due Date <span className="text-[#999] font-normal">(optional)</span></label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-colors",
                  newDeliverableDate
                    ? "border-[#5C6ECD] text-[#5C6ECD] bg-[#5C6ECD]/5"
                    : "border-[#e5e5e5] dark:border-[#444] text-[#999] hover:border-[#5C6ECD]"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {newDeliverableDate ? format(new Date(newDeliverableDate), "MMM dd, yyyy") : "Select due date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl z-[70]" align="center">
              <Calendar
                mode="single"
                selected={newDeliverableDate ? new Date(newDeliverableDate) : undefined}
                onSelect={(date) => setNewDeliverableDate(date ? format(date, "yyyy-MM-dd") : "")}
                disabled={(date) => {
                  if (formData.startDate && date < new Date(formData.startDate)) return true
                  if (formData.endDate && date > new Date(formData.endDate)) return true
                  return false
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <button
          type="button"
          disabled={!newDeliverableName.trim()}
          onClick={() => {
            setFormData(prev => ({ ...prev, deliverables: [...prev.deliverables, { id: Date.now().toString(), name: newDeliverableName.trim(), date: newDeliverableDate }] }))
            setNewDeliverableName(""); setNewDeliverableDate(""); setAddDeliverableOpen(false)
          }}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all",
            newDeliverableName.trim()
              ? "bg-[#5C6ECD] text-white hover:bg-[#4A5BC7] shadow-lg shadow-[#5C6ECD]/25"
              : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
          )}
        >
          Add Deliverable
        </button>
      </div>
    </MiniModal>

    {/* ── Add Resource Modal ── */}
    <MiniModal open={addResourceOpen} onClose={() => setAddResourceOpen(false)} title="Add Reference" width="max-w-lg">
      <div className="space-y-5">
        {/* Tab selector */}
        <div className="flex bg-[#f5f5f5] dark:bg-[#222] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setResourceTab("file")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
              resourceTab === "file"
                ? "bg-white dark:bg-[#333] text-[#5C6ECD] shadow-sm"
                : "text-[#666] dark:text-[#999] hover:text-[#5C6ECD]"
            )}
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setResourceTab("link")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
              resourceTab === "link"
                ? "bg-white dark:bg-[#333] text-[#10b981] shadow-sm"
                : "text-[#666] dark:text-[#999] hover:text-[#10b981]"
            )}
          >
            <Globe className="w-4 h-4" />
            External Link
          </button>
        </div>

        {resourceTab === "file" && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#e5e5e5] dark:border-[#444] rounded-xl py-8 text-center cursor-pointer hover:border-[#5C6ECD] hover:bg-[#5C6ECD]/[0.02] transition-colors"
            >
              <div className="w-12 h-12 bg-[#5C6ECD]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-[#5C6ECD]" />
              </div>
              <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">Click to upload files</p>
              <p className="text-xs text-[#999] mt-1">Supports multiple files at once</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)])
                e.target.value = ""
              }}
              className="hidden"
            />
            {pendingFiles.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-auto">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#f9f9f9] dark:bg-[#111] rounded-lg">
                    <FileText className="w-4 h-4 text-[#5C6ECD] shrink-0" />
                    <span className="text-sm text-[#1a1a1a] dark:text-white flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-[#999] shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                    <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-[#ccc] hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={pendingFiles.length === 0}
              onClick={() => {
                // Create one reference per file so each gets uploaded individually
                const newRefs = pendingFiles.map(f => ({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  name: f.name,
                  type: "file" as const,
                  files: [f],
                }))
                setFormData(prev => ({ ...prev, references: [...prev.references, ...newRefs] }))
                setPendingFiles([]); setAddResourceOpen(false)
              }}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-semibold transition-all",
                pendingFiles.length > 0
                  ? "bg-[#5C6ECD] text-white hover:bg-[#4A5BC7] shadow-lg shadow-[#5C6ECD]/25"
                  : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
              )}
            >
              Add {pendingFiles.length > 0 ? `${pendingFiles.length} File${pendingFiles.length !== 1 ? "s" : ""}` : "Files"}
            </button>
          </div>
        )}

        {resourceTab === "link" && (
          <div className="space-y-4">
            {/* Already added links */}
            {pendingLinks.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-auto">
                {pendingLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-[#f0fdf4] dark:bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
                    <Globe className="w-4 h-4 text-[#10b981] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a1a1a] dark:text-white truncate font-medium">{link.name}</p>
                      <p className="text-[11px] text-[#999] truncate">{link.url}</p>
                    </div>
                    <button type="button" onClick={() => setPendingLinks(prev => prev.filter((_, j) => j !== i))} className="text-[#ccc] hover:text-red-500 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add new link form */}
            <div className="space-y-3 p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-[#e5e5e5] dark:border-[#333]">
              <input
                type="text"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                placeholder="Link name (e.g. Competitor Website)"
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-colors"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newLinkUrl.trim()) {
                        setPendingLinks(prev => [...prev, { name: newLinkName.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }])
                        setNewLinkName(""); setNewLinkUrl("")
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={!newLinkUrl.trim()}
                  onClick={() => {
                    setPendingLinks(prev => [...prev, { name: newLinkName.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }])
                    setNewLinkName(""); setNewLinkUrl("")
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0",
                    newLinkUrl.trim()
                      ? "bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20"
                      : "bg-[#f5f5f5] dark:bg-[#222] text-[#999] cursor-not-allowed"
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={pendingLinks.length === 0}
              onClick={() => {
                const newRefs = pendingLinks.map(l => ({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  name: l.name,
                  type: "link" as const,
                }))
                setFormData(prev => ({ ...prev, references: [...prev.references, ...newRefs] }))
                setPendingLinks([]); setNewLinkName(""); setNewLinkUrl(""); setAddResourceOpen(false)
              }}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-semibold transition-all",
                pendingLinks.length > 0
                  ? "bg-[#10b981] text-white hover:bg-[#059669] shadow-lg shadow-[#10b981]/25"
                  : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
              )}
            >
              Add {pendingLinks.length > 0 ? `${pendingLinks.length} Link${pendingLinks.length !== 1 ? "s" : ""}` : "Links"}
            </button>
          </div>
        )}
      </div>
    </MiniModal>
    </>
  )
}
