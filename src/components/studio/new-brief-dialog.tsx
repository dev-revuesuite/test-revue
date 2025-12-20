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
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

// Types
interface DeliverableStage {
  id: string
  stage: string
  description: string
  date: string
}

interface TeamRole {
  id: string
  name: string
  role: string
  avatar?: string
}

interface Reference {
  id: string
  name: string
  file?: File
}

interface ExternalLink {
  id: string
  name: string
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
  // Step 2: Project Scope & Objective
  industry: string
  deliverable: string
  scopeDescription: string
  // Step 3: Timeline & Milestone
  startDate: string
  endDate: string
  endTime: string
  deliverableStages: DeliverableStage[]
  // Step 4: Team & Roles
  accountManager: string
  autoDeleteIteration: string
  needQCTool: boolean
  workmode: "productive" | "creative"
  teamRoles: TeamRole[]
  // Step 5: Resources
  references: Reference[]
  externalLinks: ExternalLink[]
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

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Real Estate",
  "Entertainment",
  "Food & Beverage",
  "Travel & Hospitality",
  "Other"
]

const scopeDescriptions = [
  "Full project scope",
  "Partial scope - Design only",
  "Partial scope - Development only",
  "Consultation",
  "Revision/Updates",
  "Maintenance",
  "Other"
]

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

const accountManagersData: TeamMember[] = [
  { id: "1", name: "John Doe", email: "john@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
  { id: "2", name: "Jane Smith", email: "jane@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
  { id: "3", name: "Mike Johnson", email: "mike@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" },
  { id: "4", name: "Sarah Williams", email: "sarah@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
  { id: "5", name: "Robert Brown", email: "robert@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert" },
]

const teamMembersData: TeamMember[] = [
  { id: "1", name: "Alex Turner", email: "alex@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", role: "Designer" },
  { id: "2", name: "Emma Wilson", email: "emma@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma", role: "Developer" },
  { id: "3", name: "Chris Davis", email: "chris@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris", role: "Project Manager" },
  { id: "4", name: "Lisa Anderson", email: "lisa@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa", role: "QC Analyst" },
  { id: "5", name: "David Lee", email: "david@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David", role: "Content Writer" },
  { id: "6", name: "Sophie Clark", email: "sophie@company.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie", role: "Designer" },
]

const clientsData: TeamMember[] = [
  { id: "1", name: "TechVision Labs", email: "contact@techvision.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TV" },
  { id: "2", name: "Design Co", email: "hello@designco.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=DC" },
  { id: "3", name: "StartUp Inc", email: "info@startup.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SI" },
  { id: "4", name: "Global Media", email: "media@global.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GM" },
  { id: "5", name: "Creative Agency", email: "team@creative.com", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CA" },
]

const accountManagers = accountManagersData.map(m => m.name)

const deleteIterationOptions = [
  "7 Days",
  "14 Days",
  "30 Days",
  "60 Days",
  "90 Days",
  "Never"
]

const roleOptions = [
  "Client Servicing",
  "Designer",
  "Developer",
  "Project Manager",
  "QC Analyst",
  "Content Writer",
  "Marketing",
  "Other"
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

const clientOptions = clientsData.map(c => c.name)

interface NewBriefDialogProps {
  open: boolean
  onClose: () => void
  onComplete: (data: BriefFormData) => void
}

export function NewBriefDialog({ open, onClose, onComplete }: NewBriefDialogProps) {
  const [step, setStep] = useState(1)
  const totalSteps = 5
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const [formData, setFormData] = useState<BriefFormData>({
    // Step 1
    projectName: "",
    description: "",
    clientName: "",
    projectType: "UI Designing",
    // Step 2
    industry: "",
    deliverable: "",
    scopeDescription: "",
    // Step 3
    startDate: "",
    endDate: "",
    endTime: "",
    deliverableStages: [
      { id: "1", stage: "Stage 1", description: "", date: "" },
      { id: "2", stage: "Stage 2", description: "", date: "" },
    ],
    // Step 4
    accountManager: "",
    autoDeleteIteration: "30 Days",
    needQCTool: false,
    workmode: "productive",
    teamRoles: [
      { id: "1", name: "", role: "Client Servicing" },
      { id: "2", name: "", role: "Client Servicing" },
    ],
    // Step 5
    references: [{ id: "1", name: "" }],
    externalLinks: [{ id: "1", name: "" }],
    namingColumns: [
      { id: "1", value: "Brand Name" },
      { id: "2", value: "Project Name" },
      { id: "3", value: "Date" },
      { id: "4", value: "Version" },
    ],
    otherDescription: "",
  })

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && !(e.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete(formData)
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const canContinue = () => {
    switch (step) {
      case 1:
        return formData.projectName.trim() !== "" && formData.clientName.trim() !== ""
      case 2:
        return true
      case 3:
        return formData.startDate !== "" && formData.endDate !== ""
      case 4:
        return formData.accountManager !== ""
      case 5:
        return true
      default:
        return true
    }
  }

  // Add functions
  const addDeliverableStage = () => {
    const newIndex = formData.deliverableStages.length + 1
    setFormData(prev => ({
      ...prev,
      deliverableStages: [
        ...prev.deliverableStages,
        { id: Date.now().toString(), stage: `Stage ${newIndex}`, description: "", date: "" }
      ]
    }))
  }

  const removeDeliverableStage = (id: string) => {
    if (formData.deliverableStages.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverableStages: prev.deliverableStages.filter(s => s.id !== id)
      }))
    }
  }

  const addTeamRole = () => {
    setFormData(prev => ({
      ...prev,
      teamRoles: [
        ...prev.teamRoles,
        { id: Date.now().toString(), name: "", role: "Client Servicing" }
      ]
    }))
  }

  const removeTeamRole = (id: string) => {
    if (formData.teamRoles.length > 1) {
      setFormData(prev => ({
        ...prev,
        teamRoles: prev.teamRoles.filter(r => r.id !== id)
      }))
    }
  }

  const addReference = () => {
    setFormData(prev => ({
      ...prev,
      references: [
        ...prev.references,
        { id: Date.now().toString(), name: "" }
      ]
    }))
  }

  const removeReference = (id: string) => {
    if (formData.references.length > 1) {
      setFormData(prev => ({
        ...prev,
        references: prev.references.filter(r => r.id !== id)
      }))
    }
  }

  const addExternalLink = () => {
    setFormData(prev => ({
      ...prev,
      externalLinks: [
        ...prev.externalLinks,
        { id: Date.now().toString(), name: "" }
      ]
    }))
  }

  const removeExternalLink = (id: string) => {
    if (formData.externalLinks.length > 1) {
      setFormData(prev => ({
        ...prev,
        externalLinks: prev.externalLinks.filter(l => l.id !== id)
      }))
    }
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
  const updateDeliverableStage = (id: string, field: keyof DeliverableStage, value: string) => {
    setFormData(prev => ({
      ...prev,
      deliverableStages: prev.deliverableStages.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      )
    }))
  }

  const updateTeamRole = (id: string, field: keyof TeamRole, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamRoles: prev.teamRoles.map(r =>
        r.id === id ? { ...r, [field]: value } : r
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

  const updateExternalLink = (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.map(l =>
        l.id === id ? { ...l, name } : l
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] shadow-2xl max-h-48 overflow-auto" style={{ zIndex: 99999 }}>
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
              <img
                src={selectedMember.avatar}
                alt=""
                className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{selectedMember.name}</p>
                <p className="text-xs text-[#666] truncate">{selectedMember.email}</p>
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
                    <img
                      src={member.avatar}
                      alt=""
                      className="w-8 h-8 bg-[#e5e5e5] dark:bg-[#333] object-cover"
                    />
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
          {/* Logo - Figma style */}
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="10" height="10" rx="2" fill="#F24E1E"/>
              <rect x="11" width="10" height="10" rx="2" fill="#FF7262"/>
              <rect x="22" width="10" height="10" rx="2" fill="#A259FF"/>
              <rect y="11" width="10" height="10" rx="2" fill="#1ABCFE"/>
              <rect x="11" y="11" width="10" height="10" rx="2" fill="#0ACF83"/>
              <rect x="22" y="11" width="10" height="10" rx="2" fill="#5C6ECD"/>
              <rect y="22" width="10" height="10" rx="2" fill="#F24E1E"/>
              <rect x="11" y="22" width="10" height="10" rx="2" fill="#FF7262"/>
              <rect x="22" y="22" width="10" height="10" rx="2" fill="#A259FF"/>
            </svg>
            <span className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Revue</span>
          </div>

          {/* Steps Indicator - Same style as NewClientOnboarding */}
          <div className="flex items-center gap-6">
            {[
              { num: 1, label: "Brand Information" },
              { num: 2, label: "Project scope & Objective" },
              { num: 3, label: "Timeline & Milestone" },
              { num: 4, label: "Team & Roles" },
              { num: 5, label: "Resources" }
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
                {i < 4 && (
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
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="Enter project name"
                    className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                  />
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
                    members={clientsData}
                    placeholder="Select Client"
                    onChange={(value) => setFormData(prev => ({ ...prev, clientName: value }))}
                  />
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

          {/* Step 2: Project Scope & Objective */}
          {step === 2 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">2</span>
                  Project scope & Objective
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Define the scope
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  What will be delivered in this project
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Industry
                  </label>
                  <CustomDropdown
                    id="industry"
                    value={formData.industry}
                    options={industries}
                    placeholder="Select Industry"
                    onChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                  />
                </div>

                {/* Deliverable */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Deliverable
                  </label>
                  <input
                    type="text"
                    value={formData.deliverable}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliverable: e.target.value }))}
                    placeholder="Enter deliverable"
                    className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Description
                  </label>
                  <CustomDropdown
                    id="scopeDescription"
                    value={formData.scopeDescription}
                    options={scopeDescriptions}
                    placeholder="Select Description"
                    onChange={(value) => setFormData(prev => ({ ...prev, scopeDescription: value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Milestone */}
          {step === 3 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">3</span>
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
                <div className="grid grid-cols-3 gap-4">
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
                            "w-full justify-start text-left font-normal h-12 px-4 border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
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
                          onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date ? format(date, "yyyy-MM-dd") : "" }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                            "w-full justify-start text-left font-normal h-12 px-4 border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
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
                          onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date ? format(date, "yyyy-MM-dd") : "" }))}
                          disabled={(date) => formData.startDate ? date < new Date(formData.startDate) : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Time Picker */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      End Time <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12 px-4 border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                            !formData.endTime && "text-[#999]"
                          )}
                        >
                          <Clock className="mr-3 h-4 w-4 text-[#5C6ECD]" />
                          {formData.endTime ? format(new Date(`2000-01-01T${formData.endTime}`), "h:mm a") : "Select time"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto">
                          {Array.from({ length: 24 }, (_, hour) =>
                            ["00", "30"].map(min => {
                              const timeValue = `${hour.toString().padStart(2, "0")}:${min}`
                              const displayTime = format(new Date(`2000-01-01T${timeValue}`), "h:mm a")
                              return (
                                <button
                                  key={timeValue}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, endTime: timeValue }))}
                                  className={cn(
                                    "px-2 py-1.5 text-xs font-medium transition-colors",
                                    formData.endTime === timeValue
                                      ? "bg-[#5C6ECD] text-white"
                                      : "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white"
                                  )}
                                >
                                  {displayTime}
                                </button>
                              )
                            })
                          ).flat()}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Deliverables Dates */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Deliverables Dates</h3>
                  <div className="space-y-3">
                    {formData.deliverableStages.map((stage) => (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-full bg-[#DBFE52] text-black text-sm font-medium min-w-[80px] text-center">
                          {stage.stage}
                        </div>
                        <input
                          type="text"
                          value={stage.description}
                          onChange={(e) => updateDeliverableStage(stage.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1 px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[180px] justify-start text-left font-normal h-12 px-4 border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                                !stage.date && "text-[#999]"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-[#5C6ECD]" />
                              {stage.date ? format(new Date(stage.date), "MMM dd, yyyy") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={stage.date ? new Date(stage.date) : undefined}
                              onSelect={(date) => updateDeliverableStage(stage.id, 'date', date ? format(date, "yyyy-MM-dd") : "")}
                              disabled={(date) => {
                                if (formData.startDate && date < new Date(formData.startDate)) return true
                                if (formData.endDate && date > new Date(formData.endDate)) return true
                                return false
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {formData.deliverableStages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeliverableStage(stage.id)}
                            className="p-2 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addDeliverableStage}
                    className="mt-4 w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Team & Roles */}
          {step === 4 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">4</span>
                  Team & Roles
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Assign the team
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Select team members and their roles
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Account Manager */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Account manager <span className="text-[#5C6ECD] font-normal">*</span>
                  </label>
                  <RichDropdown
                    id="accountManager"
                    value={formData.accountManager}
                    members={accountManagersData}
                    placeholder="Select Manager"
                    onChange={(value) => setFormData(prev => ({ ...prev, accountManager: value }))}
                  />
                </div>

                {/* Auto delete iteration */}
                <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
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

                {/* QC Tool */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">QC Tool</h3>
                    <Info className="w-4 h-4 text-[#666]" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.needQCTool}
                      onChange={(e) => setFormData(prev => ({ ...prev, needQCTool: e.target.checked }))}
                      className="w-4 h-4 border-black dark:border-[#444] text-[#5C6ECD] focus:ring-[#5C6ECD] focus:ring-offset-0 accent-[#5C6ECD]"
                    />
                    <span className="text-sm text-[#1a1a1a] dark:text-white">Need QC Tool</span>
                  </label>
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
                      {/* Gradient overlay for unselected state on hover */}
                      {formData.workmode !== "creative" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#A259FF]/0 via-[#FF7262]/0 to-[#DBFE52]/0 group-hover:from-[#A259FF]/5 group-hover:via-[#FF7262]/5 group-hover:to-[#DBFE52]/5 transition-all" />
                      )}
                      {/* Inner content background for selected state */}
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

                {/* Roles */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Roles</h3>
                  <div className="space-y-3">
                    {formData.teamRoles.map((role) => {
                      const selectedMember = teamMembersData.find(m => m.name === role.name)
                      return (
                        <div key={role.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#e5e5e5] dark:bg-[#333] flex items-center justify-center overflow-hidden shrink-0">
                            {selectedMember?.avatar ? (
                              <img src={selectedMember.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#666] text-xs">IMG</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <RichDropdown
                              id={`teamMember-${role.id}`}
                              value={role.name}
                              members={teamMembersData}
                              placeholder="Select Team Member"
                              showRole={true}
                              onChange={(value) => updateTeamRole(role.id, 'name', value)}
                            />
                          </div>
                          <div className="w-44 shrink-0">
                            <CustomDropdown
                              id={`role-${role.id}`}
                              value={role.role}
                              options={roleOptions}
                              placeholder="Select Role"
                              onChange={(value) => updateTeamRole(role.id, 'role', value)}
                            />
                          </div>
                          {formData.teamRoles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTeamRole(role.id)}
                              className="p-2 text-[#999] hover:text-red-500 transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addTeamRole}
                    className="mt-4 w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Resources */}
          {step === 5 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">5</span>
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
                {/* Reference's */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Reference's</h3>
                  <div className="space-y-3">
                    {formData.references.map((ref, index) => (
                      <div key={ref.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#5C6ECD] text-white flex items-center justify-center text-sm font-medium shrink-0">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={ref.name}
                          onChange={(e) => updateReference(ref.id, e.target.value)}
                          placeholder="Deliverable Name"
                          className="flex-1 px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                        />
                        <input
                          ref={(el) => { fileInputRefs.current[ref.id] = el }}
                          type="file"
                          onChange={(e) => handleFileUpload(ref.id, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[ref.id]?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 border border-[#e5e5e5] dark:border-[#444] text-[#1a1a1a] dark:text-white text-sm font-medium hover:border-[#5C6ECD] transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          UPLOAD
                        </button>
                        {formData.references.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReference(ref.id)}
                            className="p-2 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={addReference}
                      className="w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Link to external document */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Link to external document</h3>
                  <div className="space-y-3">
                    {formData.externalLinks.map((link, index) => (
                      <div key={link.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#5C6ECD] text-white flex items-center justify-center text-sm font-medium shrink-0">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => updateExternalLink(link.id, e.target.value)}
                          placeholder="Deliverable Name"
                          className="flex-1 px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                        />
                        {formData.externalLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExternalLink(link.id)}
                            className="p-2 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={addExternalLink}
                      className="w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Naming Convention */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-1">Naming Convention</h3>
                  <p className="text-xs text-[#999] mb-3">Suggested order : Brand Name_Project name_Date_Version</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {formData.namingColumns.map((col, index) => (
                      <React.Fragment key={col.id}>
                        <div className="shrink-0 min-w-[120px]">
                          <CustomDropdown
                            id={`naming-${col.id}`}
                            value={col.value}
                            options={namingOptions}
                            placeholder="Select"
                            onChange={(value) => updateNamingColumn(col.id, value)}
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
