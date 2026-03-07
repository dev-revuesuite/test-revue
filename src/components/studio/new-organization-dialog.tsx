"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  Building2,
  X,
  Plus,
  Check,
  Search,
  Users,
  Mail,
  Globe,
  Briefcase,
  ArrowRight,
  Upload,
  Camera,
  ChevronDown,
} from "lucide-react"

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

// Mock existing team members
const existingTeamMembers: TeamMember[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@example.com", avatar: "", role: "Designer" },
  { id: "2", name: "Mike Chen", email: "mike@example.com", avatar: "", role: "Developer" },
  { id: "3", name: "Emily Davis", email: "emily@example.com", avatar: "", role: "Project Manager" },
  { id: "4", name: "Alex Rodriguez", email: "alex@example.com", avatar: "", role: "Marketing" },
  { id: "5", name: "Jordan Lee", email: "jordan@example.com", avatar: "", role: "Designer" },
  { id: "6", name: "Chris Taylor", email: "chris@example.com", avatar: "", role: "Developer" },
]

const industryOptions = [
  "Technology",
  "Design Agency",
  "Marketing",
  "E-commerce",
  "Healthcare",
  "Education",
  "Finance",
  "Real Estate",
  "Media & Entertainment",
  "Other",
]

const companySizeOptions = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
]

interface NewOrganizationDialogProps {
  open: boolean
  onClose: () => void
  onComplete: (data: any) => void
}

export function NewOrganizationDialog({ open, onClose, onComplete }: NewOrganizationDialogProps) {
  const [step, setStep] = React.useState(1)
  const totalSteps = 3

  // Step 1: Basic Info
  const [orgName, setOrgName] = React.useState("")
  const [orgAbbr, setOrgAbbr] = React.useState("")
  const [industry, setIndustry] = React.useState("")
  const [companySize, setCompanySize] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)

  // Step 2: Team Members
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedMembers, setSelectedMembers] = React.useState<TeamMember[]>([])

  // Step 3: Invite New Members
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([])

  const filteredMembers = existingTeamMembers.filter(
    (member) =>
      (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
      !selectedMembers.find((m) => m.id === member.id)
  )

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateAbbr = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleOrgNameChange = (value: string) => {
    setOrgName(value)
    if (!orgAbbr || orgAbbr === generateAbbr(orgName)) {
      setOrgAbbr(generateAbbr(value))
    }
  }

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMembers([...selectedMembers, member])
  }

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== memberId))
  }

  const handleAddInviteEmail = () => {
    if (inviteEmail && !inviteEmails.includes(inviteEmail) && inviteEmail.includes("@")) {
      setInviteEmails([...inviteEmails, inviteEmail])
      setInviteEmail("")
    }
  }

  const handleRemoveInviteEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email))
  }

  const canContinue = () => {
    if (step === 1) {
      return orgName.trim() !== "" && industry !== ""
    }
    return true
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = () => {
    const data = {
      name: orgName,
      abbreviation: orgAbbr,
      industry,
      companySize,
      website,
      logo: logoPreview,
      teamMembers: selectedMembers,
      invitedEmails: inviteEmails,
    }
    onComplete(data)
    resetForm()
  }

  const resetForm = () => {
    setStep(1)
    setOrgName("")
    setOrgAbbr("")
    setIndustry("")
    setCompanySize("")
    setWebsite("")
    setLogoPreview(null)
    setSearchQuery("")
    setSelectedMembers([])
    setInviteEmail("")
    setInviteEmails([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90vw] h-[90vh] bg-white dark:bg-[#0a0a0a] flex flex-col shadow-2xl">
        {/* Header - Same as NewBriefDialog */}
        <header className="px-8 py-5 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
          <div className="flex items-center justify-between">
            {/* Revue Logo */}
            <div className="flex items-center gap-3">
              <img src="/Logo/Artboard 5@2x.png" alt="Revue" width={32} height={32} />
              <span className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Revue</span>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center gap-6">
              {[
                { num: 1, label: "Basic Info" },
                { num: 2, label: "Team Members" },
                { num: 3, label: "Invite" }
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
                        "text-sm hidden md:block",
                        step >= s.num
                          ? "text-[#1a1a1a] dark:text-white font-medium"
                          : "text-[#999]"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={cn(
                      "w-12 h-[2px]",
                      step > s.num ? "bg-[#5C6ECD]" : "bg-[#e5e5e5] dark:bg-[#333]"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <X className="w-5 h-5 text-[#666] dark:text-[#999]" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div
                    className={cn(
                      "w-24 h-24 border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors",
                      logoPreview
                        ? "border-[#5C6ECD] bg-[#5C6ECD]/5"
                        : "border-[#e6e6e6] dark:border-[#444] hover:border-[#5C6ECD]"
                    )}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-6 h-6 text-[#999] mx-auto mb-1" />
                        <span className="text-[10px] text-[#999]">Add Logo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  {/* Organization Name */}
                  <div>
                    <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                      Organization Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a7a]" />
                      <Input
                        placeholder="Enter organization name"
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  {/* Abbreviation */}
                  <div>
                    <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                      Abbreviation
                    </label>
                    <Input
                      placeholder="AB"
                      value={orgAbbr}
                      onChange={(e) => setOrgAbbr(e.target.value.toUpperCase().slice(0, 3))}
                      className="w-24 h-11 text-center font-semibold"
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                  Industry *
                </label>
                <div className="flex flex-wrap gap-2">
                  {industryOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setIndustry(option)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border transition-all",
                        industry === option
                          ? "border-[#5C6ECD] bg-[#5C6ECD]/10 text-[#5C6ECD]"
                          : "border-[#e6e6e6] dark:border-[#444] text-[#7a7a7a] hover:border-[#5C6ECD] hover:text-[#5C6ECD]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Size */}
              <div>
                <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                  Company Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {companySizeOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setCompanySize(option)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border transition-all",
                        companySize === option
                          ? "border-[#5C6ECD] bg-[#5C6ECD]/10 text-[#5C6ECD]"
                          : "border-[#e6e6e6] dark:border-[#444] text-[#7a7a7a] hover:border-[#5C6ECD] hover:text-[#5C6ECD]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                  Website (Optional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a7a]" />
                  <Input
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Existing Team Members */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-1">
                  Add Existing Team Members
                </h3>
                <p className="text-xs text-[#7a7a7a] dark:text-[#999]">
                  Select team members from your account to add to this organization
                </p>
              </div>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#333] border border-[#e6e6e6] dark:border-[#444]"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-[10px] bg-[#5C6ECD] text-white">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-[#1a1a1a] dark:text-white">{member.name}</span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-[#f0f0f0] dark:hover:bg-[#444] transition-colors"
                      >
                        <X className="w-3 h-3 text-[#7a7a7a]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a7a]" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Member List */}
              <div className="border border-[#e6e6e6] dark:border-[#444] max-h-[250px] overflow-y-auto">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors border-b border-[#e6e6e6] dark:border-[#444] last:border-0"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-[#5C6ECD] text-white text-sm">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#999]">
                          {member.email} - {member.role}
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-[#5C6ECD]" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 text-[#999] mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-[#7a7a7a] dark:text-[#999]">
                      {searchQuery ? "No members found" : "No more members available"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Invite New Members */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-1">
                  Invite New Members
                </h3>
                <p className="text-xs text-[#7a7a7a] dark:text-[#999]">
                  Send email invitations to people outside your current team
                </p>
              </div>

              {/* Email Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a7a]" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddInviteEmail()}
                    className="pl-10 h-11"
                  />
                </div>
                <Button
                  onClick={handleAddInviteEmail}
                  className="h-11 px-5 bg-[#5C6ECD] hover:bg-[#3651d4] text-white"
                >
                  Add
                </Button>
              </div>

              {/* Email Tags */}
              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  {inviteEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#333] border border-[#e6e6e6] dark:border-[#444]"
                    >
                      <Mail className="w-3 h-3 text-[#7a7a7a]" />
                      <span className="text-sm text-[#1a1a1a] dark:text-white">{email}</span>
                      <button
                        onClick={() => handleRemoveInviteEmail(email)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-[#f0f0f0] dark:hover:bg-[#444] transition-colors"
                      >
                        <X className="w-3 h-3 text-[#7a7a7a]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] space-y-3">
                <h4 className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider">
                  Organization Summary
                </h4>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-[#5C6ECD] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{orgAbbr || "?"}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-[#1a1a1a] dark:text-white">{orgName}</p>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#999]">{industry}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#7a7a7a] dark:text-[#999]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedMembers.length} team member{selectedMembers.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {inviteEmails.length} pending invite{inviteEmails.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="shrink-0 px-8 py-5 border-t border-[#e5e5e5] dark:border-[#333] bg-[#fafafa] dark:bg-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={step > 1 ? handleBack : handleClose}
              className="h-10 px-5 border-[#d9d9d9] dark:border-[#444] text-[#1a1a1a] dark:text-white"
            >
              {step > 1 ? "Back" : "Cancel"}
            </Button>
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
              {step === totalSteps ? "Create Organization" : "Continue"}
              <ArrowRight
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  canContinue() && "group-hover:translate-x-1"
                )}
              />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
