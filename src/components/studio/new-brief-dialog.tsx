"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
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
  ExternalLink as LinkIcon
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
  file?: File
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
  "Photography",
  "Social Media",
  "Other"
]

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

const deleteIterationOptions = [
  "7 Days",
  "14 Days",
  "30 Days",
  "60 Days",
  "90 Days",
  "Never"
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
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Convert teamMembers to TeamMember format for dropdowns
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(initialFormData)
      setStep(1)
      setErrors({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [refTypePopoverOpen, setRefTypePopoverOpen] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && !(e.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
      if (refTypePopoverOpen && !(e.target as Element).closest('.ref-type-popover')) {
        setRefTypePopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, refTypePopoverOpen])

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
    }

    if (currentStep === 2) {
      if (!formData.startDate) newErrors.startDate = "Start date is required"
      if (!formData.endDate) newErrors.endDate = "End date is required"
      if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = "End date must be after start date"
      }
    }

    if (currentStep === 3) {
      if (!formData.accountManager) newErrors.accountManager = "Please select an account manager"
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
      onComplete(formData)
    }
  }

  const handlePrevious = () => {
    setErrors({})
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const canContinue = () => {
    switch (step) {
      case 1:
        return formData.projectName.trim() !== "" && formData.clientName.trim() !== ""
      case 2:
        return formData.startDate !== "" && formData.endDate !== ""
      case 3:
        return formData.accountManager !== ""
      case 4:
        return true
      default:
        return true
    }
  }

  // Add functions
  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        { id: Date.now().toString(), name: "", date: "" }
      ]
    }))
  }

  const removeDeliverable = (id: string) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== id)
    }))
  }


  const addReference = (type: "file" | "link") => {
    setFormData(prev => ({
      ...prev,
      references: [
        ...prev.references,
        { id: Date.now().toString(), name: "", type }
      ]
    }))
    setRefTypePopoverOpen(false)
  }

  const removeReference = (id: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter(r => r.id !== id)
    }))
  }

  const addNamingColumn = () => {
    setFormData(prev => ({
      ...prev,
      namingColumns: [
        ...prev.namingColumns,
        { id: Date.now().toString(), value: "Brand Name" }
      ]
    }))
  }

  // Update functions
  const updateDeliverable = (id: string, field: keyof DeliverableItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      )
    }))
  }

  const updateReference = (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.map(r =>
        r.id === id ? { ...r, name } : r
      )
    }))
  }

  const updateNamingColumn = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      namingColumns: prev.namingColumns.map(c =>
        c.id === id ? { ...c, value } : c
      )
    }))
  }

  const handleFileUpload = (refId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        references: prev.references.map(r =>
          r.id === refId ? { ...r, file, name: r.name || file.name } : r
        )
      }))
    }
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
          "w-full flex items-center justify-between px-4 py-3 border text-left transition-colors",
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
        <ChevronDown className={cn(
          "w-5 h-5 text-[#999] transition-transform",
          dropdownOpen === id && "rotate-180 text-[#5C6ECD]"
        )} />
      </button>
      {dropdownOpen === id && (
        <div className={cn(
          "absolute left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] shadow-2xl max-h-48 overflow-auto",
          className.includes("dropdown-upward") ? "bottom-full mb-1" : "top-full mt-1"
        )} style={{ zIndex: 99999 }}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt)
                setDropdownOpen(null)
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm hover:bg-[#5C6ECD]/10 transition-colors flex items-center justify-between",
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

  // Rich Dropdown Component with Profile Images and Search
  const [richSearchQuery, setRichSearchQuery] = useState<{ [key: string]: string }>({})

  const RichDropdown = ({
    id,
    value,
    members,
    placeholder,
    onChange,
    showRole = false,
    className = ""
  }: {
    id: string
    value: string
    members: TeamMember[]
    placeholder: string
    onChange: (value: string) => void
    showRole?: boolean
    className?: string
  }) => {
    const searchQuery = richSearchQuery[id] || ""
    const filteredMembers = members.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const selectedMember = members.find(m => m.name === value)

    return (
      <div className={cn("relative dropdown-container", className)} style={{ zIndex: dropdownOpen === id ? 9999 : 30 }}>
        <button
          type="button"
          onClick={() => setDropdownOpen(dropdownOpen === id ? null : id)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 border text-left transition-colors",
            dropdownOpen === id
              ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-[#1a1a1a]"
              : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] hover:border-[#5C6ECD]"
          )}
        >
          {selectedMember ? (
            <>
              {selectedMember.avatar ? (
                <img
                  src={selectedMember.avatar}
                  alt=""
                  className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover rounded"
                />
              ) : (
                <div className="w-8 h-8 bg-[#5C6ECD] flex items-center justify-center rounded shrink-0">
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
            dropdownOpen === id && "rotate-180 text-[#5C6ECD]"
          )} />
        </button>
        {dropdownOpen === id && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] shadow-2xl" style={{ zIndex: 99999 }}>
            {/* Search Input */}
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#444]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setRichSearchQuery(prev => ({ ...prev, [id]: e.target.value }))}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#444] bg-[#f9f9f9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {/* Members List */}
            <div className="max-h-48 overflow-auto">
              {filteredMembers.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[#999] text-center">No results found</div>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onChange(member.name)
                      setDropdownOpen(null)
                      setRichSearchQuery(prev => ({ ...prev, [id]: "" }))
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#5C6ECD]/10 transition-colors",
                      value === member.name && "bg-[#5C6ECD]/10"
                    )}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt=""
                        className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#5C6ECD] flex items-center justify-center rounded shrink-0">
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
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90vw] h-[90vh] bg-white dark:bg-[#0a0a0a] flex flex-col shadow-2xl">
      {/* Header - Same as NewClientOnboarding */}
      <header className="px-8 py-5 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
        <div className="flex items-center justify-between">
          {/* Revue Logo */}
          <div className="flex items-center">
            <img src="/Logo/Artboard 8@2x.png" alt="Revue" width={120} height={37} className="dark:hidden" />
            <img src="/Logo/Artboard 8 copy@2x.png" alt="Revue" width={120} height={37} className="hidden dark:block" />
          </div>

          {/* Steps Indicator - Same style as NewClientOnboarding */}
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
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      step >= s.num
                        ? "text-[#1a1a1a] dark:text-white"
                        : "text-[#999]"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className={cn(
                    "w-12 h-0.5 rounded-full transition-colors",
                    step > s.num ? "bg-[#5C6ECD]" : "bg-[#e5e5e5] dark:bg-[#333]"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#5C6ECD] hover:bg-[#5C6ECD]/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-visible px-8 pt-6 pb-8">
        <div className="w-full max-w-2xl mx-auto">

          {/* Step 1: Brand Information */}
          {step === 1 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">1</span>
                  Brand Information
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Tell us about the project
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Basic information to get started with your new brief
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Project Name <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, projectName: e.target.value }))
                      clearError('projectName')
                    }}
                    placeholder="Enter project name"
                    className={cn(
                      "w-full px-4 py-3 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                      errors.projectName
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                    )}
                  />
                  {errors.projectName && <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter project description"
                    className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Client Name <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <RichDropdown
                    id="clientName"
                    value={formData.clientName}
                    members={clientDirectory.map(c => ({ id: c.id, name: c.name, email: "", avatar: c.logoUrl }))}
                    placeholder="Select Client"
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, clientName: value }))
                      clearError('clientName')
                    }}
                  />
                  {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                </div>

                {/* Project Type */}
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
            </div>
          )}

          {/* Step 2: Timeline & Milestone */}
          {step === 2 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">2</span>
                  Timeline & Milestone
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Set the timeline
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Define project dates and milestones
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Date Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date Picker */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Start Date <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12 px-4 bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                            errors.startDate
                              ? "border-red-500"
                              : "border-[#e5e5e5] dark:border-[#444]",
                            !formData.startDate && "text-[#999]"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-[#5C6ECD]" />
                          {formData.startDate ? format(new Date(formData.startDate), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate ? new Date(formData.startDate) : undefined}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, startDate: date ? format(date, "yyyy-MM-dd") : "" }))
                            clearError('startDate')
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                  </div>

                  {/* End Date Picker */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      End Date <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12 px-4 bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                            errors.endDate
                              ? "border-red-500"
                              : "border-[#e5e5e5] dark:border-[#444]",
                            !formData.endDate && "text-[#999]"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-[#5C6ECD]" />
                          {formData.endDate ? format(new Date(formData.endDate), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate ? new Date(formData.endDate) : undefined}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, endDate: date ? format(date, "yyyy-MM-dd") : "" }))
                            clearError('endDate')
                          }}
                          disabled={(date) => formData.startDate ? date < new Date(formData.startDate) : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                  </div>
                </div>

                {/* Deliverables */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Deliverables</h3>
                    {formData.deliverables.length > 0 && (
                      <span className="text-xs text-[#999]">{formData.deliverables.length} item{formData.deliverables.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {formData.deliverables.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {formData.deliverables.map((item, index) => (
                        <div key={item.id} className="group flex items-center gap-3 px-3 py-2.5 border border-[#e5e5e5] dark:border-[#333] hover:border-[#5C6ECD]/30 transition-colors">
                          <div className="w-5 h-5 rounded-full border-2 border-[#ccc] dark:border-[#555] shrink-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-[#999]">{index + 1}</span>
                          </div>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateDeliverable(item.id, 'name', e.target.value)}
                            placeholder="Deliverable name"
                            className="flex-1 text-sm text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none bg-transparent"
                            autoFocus={!item.name}
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-colors",
                                  item.date
                                    ? "bg-[#5C6ECD]/10 text-[#5C6ECD]"
                                    : "text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#222]"
                                )}
                              >
                                <CalendarIcon className="w-3 h-3" />
                                {item.date ? format(new Date(item.date), "MMM dd") : "Due date"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="single"
                                selected={item.date ? new Date(item.date) : undefined}
                                onSelect={(date) => updateDeliverable(item.id, 'date', date ? format(date, "yyyy-MM-dd") : "")}
                                disabled={(date) => {
                                  if (formData.startDate && date < new Date(formData.startDate)) return true
                                  if (formData.endDate && date > new Date(formData.endDate)) return true
                                  return false
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                    <div className="mb-3 py-8 border border-dashed border-[#e5e5e5] dark:border-[#333] text-center">
                      <p className="text-sm text-[#999] mb-1">No deliverables added yet</p>
                      <p className="text-xs text-[#bbb] dark:text-[#555]">Add items that need to be delivered for this project</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="w-full py-2.5 border border-dashed border-[#ccc] dark:border-[#444] text-sm text-[#666] dark:text-[#999] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors flex items-center justify-center gap-2"
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
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">3</span>
                  Team & Settings
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Assign the team
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Select team members for this project
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Account Manager */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Project Manager <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <RichDropdown
                    id="accountManager"
                    value={formData.accountManager}
                    members={teamMembersData}
                    placeholder="Select Manager"
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, accountManager: value }))
                      clearError('accountManager')
                    }}
                  />
                  {errors.accountManager && <p className="text-xs text-red-500 mt-1">{errors.accountManager}</p>}
                </div>

                {/* Team Members */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Team Members</h3>
                  {/* Selected members */}
                  {formData.teamMemberIds.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {formData.teamMemberIds.map((memberId) => {
                        const member = teamMembersData.find(m => m.id === memberId)
                        if (!member) return null
                        return (
                          <div key={memberId} className="group flex items-center gap-3 p-3 border border-[#e5e5e5] dark:border-[#333] hover:border-[#5C6ECD]/30 transition-colors">
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-[#5C6ECD] flex items-center justify-center rounded shrink-0">
                                <span className="text-white text-xs font-bold">{member.name.substring(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{member.name}</p>
                              <p className="text-xs text-[#666] truncate">{member.email}</p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-[#999] font-medium shrink-0">Designer</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, teamMemberIds: prev.teamMemberIds.filter(id => id !== memberId) }))}
                              className="p-1 text-[#ccc] dark:text-[#555] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Add member dropdown */}
                  <RichDropdown
                    id="addTeamMember"
                    value=""
                    members={teamMembersData.filter(m =>
                      !formData.teamMemberIds.includes(m.id) &&
                      m.name !== formData.accountManager
                    )}
                    placeholder="+ Add team member"
                    showRole={true}
                    onChange={(value) => {
                      const member = teamMembersData.find(m => m.name === value)
                      if (member && !formData.teamMemberIds.includes(member.id)) {
                        setFormData(prev => ({ ...prev, teamMemberIds: [...prev.teamMemberIds, member.id] }))
                      }
                    }}
                  />
                </div>

                {/* Workmode */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Workmode</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Productive Mode Card */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workmode: "productive" }))}
                      className={cn(
                        "relative p-5 border-2 text-left transition-all group",
                        formData.workmode === "productive"
                          ? "border-[#5C6ECD] bg-[#5C6ECD]/5 shadow-lg shadow-[#5C6ECD]/10"
                          : "border-[#e5e5e5] dark:border-[#444] hover:border-[#5C6ECD]/50 hover:bg-[#5C6ECD]/5"
                      )}
                    >
                      {formData.workmode === "productive" && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-[#5C6ECD] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          "w-10 h-10 flex items-center justify-center transition-colors",
                          formData.workmode === "productive"
                            ? "bg-[#5C6ECD]"
                            : "bg-[#e5e5e5] dark:bg-[#333] group-hover:bg-[#5C6ECD]/20"
                        )}>
                          <Zap className={cn(
                            "w-5 h-5 transition-colors",
                            formData.workmode === "productive" ? "text-white" : "text-[#666] group-hover:text-[#5C6ECD]"
                          )} />
                        </div>
                        <h4 className="text-base font-semibold text-[#1a1a1a] dark:text-white">Productive Mode</h4>
                      </div>
                      <p className="text-xs text-[#666] dark:text-[#999] leading-relaxed">
                        Focus on efficiency and structured workflows. Ideal for deadline-driven projects.
                      </p>
                    </button>

                    {/* Creative Mode Card */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workmode: "creative" }))}
                      className={cn(
                        "relative p-5 border-2 text-left transition-all group overflow-hidden",
                        formData.workmode === "creative"
                          ? "border-transparent bg-gradient-to-br from-[#A259FF] via-[#FF7262] to-[#DBFE52] shadow-lg"
                          : "border-[#e5e5e5] dark:border-[#444] hover:border-[#A259FF]/50"
                      )}
                    >
                      {formData.workmode !== "creative" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#A259FF]/0 via-[#FF7262]/0 to-[#DBFE52]/0 group-hover:from-[#A259FF]/5 group-hover:via-[#FF7262]/5 group-hover:to-[#DBFE52]/5 transition-all" />
                      )}
                      {formData.workmode === "creative" && (
                        <div className="absolute inset-[2px] bg-white dark:bg-[#0a0a0a]" />
                      )}
                      <div className="relative">
                        {formData.workmode === "creative" && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#A259FF] to-[#FF7262] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "w-10 h-10 flex items-center justify-center transition-all",
                            formData.workmode === "creative"
                              ? "bg-gradient-to-br from-[#A259FF] to-[#FF7262]"
                              : "bg-[#e5e5e5] dark:bg-[#333] group-hover:bg-gradient-to-br group-hover:from-[#A259FF]/20 group-hover:to-[#FF7262]/20"
                          )}>
                            <Sparkles className={cn(
                              "w-5 h-5 transition-colors",
                              formData.workmode === "creative" ? "text-white" : "text-[#666] group-hover:text-[#A259FF]"
                            )} />
                          </div>
                          <h4 className={cn(
                            "text-base font-semibold",
                            formData.workmode === "creative"
                              ? "bg-gradient-to-r from-[#A259FF] to-[#FF7262] bg-clip-text text-transparent"
                              : "text-[#1a1a1a] dark:text-white"
                          )}>Creative Mode</h4>
                        </div>
                        <p className="text-xs text-[#666] dark:text-[#999] leading-relaxed">
                          Flexible exploration with room for experimentation. Perfect for innovative projects.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Settings Row */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
                      Auto delete iteration after
                    </label>
                    <div className="w-32">
                      <CustomDropdown
                        id="autoDeleteIteration"
                        value={formData.autoDeleteIteration}
                        options={deleteIterationOptions}
                        placeholder="Select"
                        onChange={(value) => setFormData(prev => ({ ...prev, autoDeleteIteration: value }))}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.needQCTool}
                      onChange={(e) => setFormData(prev => ({ ...prev, needQCTool: e.target.checked }))}
                      className="w-4 h-4 border-black dark:border-[#444] text-[#5C6ECD] focus:ring-[#5C6ECD] focus:ring-offset-0 accent-[#5C6ECD]"
                    />
                    <span className="text-sm text-[#1a1a1a] dark:text-white">Need QC Tool</span>
                    <Info className="w-4 h-4 text-[#666]" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Resources */}
          {step === 4 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">4</span>
                  Resources
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Add resources
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Upload references and set naming conventions
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* References (combined file + link) */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">References</h3>
                  {formData.references.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {formData.references.map((ref) => (
                        <div key={ref.id} className="group flex items-center gap-3 p-3 border border-[#e5e5e5] dark:border-[#333] hover:border-[#5C6ECD]/30 transition-colors">
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center shrink-0 text-white text-xs font-bold",
                            ref.type === "file" ? "bg-[#5C6ECD]" : "bg-[#10b981]"
                          )}>
                            {ref.type === "file" ? <Upload className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                          </div>
                          <input
                            type="text"
                            value={ref.name}
                            onChange={(e) => updateReference(ref.id, e.target.value)}
                            placeholder={ref.type === "file" ? "Reference name" : "Paste link URL"}
                            className="flex-1 text-sm text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none bg-transparent"
                          />
                          {ref.type === "file" && (
                            <>
                              <input
                                ref={(el) => { fileInputRefs.current[ref.id] = el }}
                                type="file"
                                onChange={(e) => handleFileUpload(ref.id, e)}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[ref.id]?.click()}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#e5e5e5] dark:border-[#444] text-[#666] dark:text-[#999] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors"
                              >
                                <Upload className="w-3 h-3" />
                                {ref.file ? ref.file.name.slice(0, 15) : "Upload"}
                              </button>
                            </>
                          )}
                          <span className="text-[10px] uppercase tracking-wider text-[#999] font-medium shrink-0">
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
                    <div className="mb-3 py-6 border border-dashed border-[#e5e5e5] dark:border-[#333] text-center">
                      <p className="text-sm text-[#999]">No references added yet</p>
                    </div>
                  )}
                  <div className="relative inline-block ref-type-popover">
                    <button
                      type="button"
                      onClick={() => setRefTypePopoverOpen(!refTypePopoverOpen)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-dashed border-[#ccc] dark:border-[#444] text-[#666] dark:text-[#999] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add reference
                    </button>
                    {refTypePopoverOpen && (
                      <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] shadow-xl z-50 w-48">
                        <button
                          type="button"
                          onClick={() => addReference("file")}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#5C6ECD]/10 transition-colors"
                        >
                          <Upload className="w-4 h-4 text-[#5C6ECD]" />
                          <span className="text-[#1a1a1a] dark:text-white">Upload file</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addReference("link")}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#5C6ECD]/10 transition-colors border-t border-[#e5e5e5] dark:border-[#444]"
                        >
                          <LinkIcon className="w-4 h-4 text-[#10b981]" />
                          <span className="text-[#1a1a1a] dark:text-white">External link</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Naming Convention */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
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
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={addNamingColumn}
                      className="w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Other Description */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Other Description</h3>
                  <textarea
                    value={formData.otherDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherDescription: e.target.value }))}
                    placeholder=""
                    rows={4}
                    className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Same as NewClientOnboarding */}
      <footer className="border-t border-[#e5e5e5] dark:border-[#333] px-8 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2.5 font-medium text-[#1a1a1a] dark:text-white border border-[#e5e5e5] dark:border-[#444] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors"
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
              "group flex items-center gap-2 px-8 py-2.5 font-medium transition-all",
              canContinue()
                ? "bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white shadow-lg shadow-[#5C6ECD]/25"
                : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
            )}
          >
            {step === totalSteps ? "Create Brief" : "Continue"}
            <ArrowRight className={cn(
              "w-4 h-4 transition-transform duration-200",
              canContinue() && "group-hover:translate-x-1"
            )} />
          </button>
        </div>
      </footer>
      </div>
    </div>
  )
}
