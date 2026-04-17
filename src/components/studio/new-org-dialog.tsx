"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  X,
  Loader2,
  Sparkles,
  Globe,
  Mail,
  Phone,
  ChevronDown,
  Check,
  Upload,
  MapPin,
  Users,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { switchOrganization } from "@/lib/actions/switch-organization"

// ── Props ──
interface NewOrganizationDialogProps {
  open: boolean
  onClose: () => void
}

// ── Dropdown Options (matching Account → Organisations settings) ──
const industryOptions = [
  "Design & Creative",
  "Technology",
  "Marketing",
  "Finance",
  "Healthcare",
  "Education",
]

const sizeOptions = ["1-10", "11-50", "51-200", "201-500", "500+"]

const countryOptions = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
]

const stateOptionsByCountry: Record<string, string[]> = {
  India: [
    "Uttar Pradesh",
    "Maharashtra",
    "Karnataka",
    "Tamil Nadu",
    "Delhi",
    "Rajasthan",
    "Gujarat",
    "West Bengal",
    "Madhya Pradesh",
    "Kerala",
  ],
  "United States": [
    "California",
    "New York",
    "Texas",
    "Florida",
    "Illinois",
    "Washington",
    "Massachusetts",
    "Colorado",
  ],
  "United Kingdom": [
    "England",
    "Scotland",
    "Wales",
    "Northern Ireland",
  ],
  Canada: [
    "Ontario",
    "Quebec",
    "British Columbia",
    "Alberta",
    "Manitoba",
  ],
  Australia: [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
  ],
}

// ── Form Dropdown ──
function FormDropdown({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ zIndex: isOpen ? 9999 : 30 }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-sm transition-colors",
          isOpen
            ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-[#1a1a1a]"
            : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] hover:border-[#5C6ECD]"
        )}
      >
        <span className={value ? "text-[#1a1a1a] dark:text-white" : "text-[#999]"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#999] transition-transform",
            isOpen && "rotate-180 text-[#5C6ECD]"
          )}
        />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] rounded-xl shadow-2xl max-h-48 overflow-auto p-1.5"
          style={{ zIndex: 99999 }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm rounded-lg hover:bg-[#5C6ECD]/10 transition-colors flex items-center justify-between",
                value === opt && "bg-[#5C6ECD]/10 text-[#5C6ECD]"
              )}
            >
              <span
                className={
                  value === opt
                    ? "text-[#5C6ECD] font-medium"
                    : "text-[#1a1a1a] dark:text-white"
                }
              >
                {opt}
              </span>
              {value === opt && (
                <Check className="w-4 h-4 text-[#5C6ECD]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section Label ──
function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-2">
      {icon}
      <span className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

// ── Main Dialog ──
export function NewOrganizationDialog({
  open,
  onClose,
}: NewOrganizationDialogProps) {
  const router = useRouter()

  // Form state
  const [orgName, setOrgName] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [industry, setIndustry] = useState("")
  const [size, setSize] = useState("")
  const [country, setCountry] = useState("")
  const [state, setState] = useState("")

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setOrgName("")
      setLogoFile(null)
      setLogoPreview(null)
      setEmail("")
      setPhone("")
      setWebsite("")
      setIndustry("")
      setSize("")
      setCountry("")
      setState("")
      setIsCreating(false)
      setError(null)
    }
  }, [open])

  // Reset state when country changes
  useEffect(() => {
    setState("")
  }, [country])

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required")
      return
    }

    setError(null)
    setIsCreating(true)

    try {
      const supabase = createClient()

      // 1. Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError("Unable to get user info. Please try again.")
        setIsCreating(false)
        return
      }

      // 2. Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      const userName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User"

      // 3. Upload logo if provided
      let logoUrl: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split(".").pop()
        const path = `org-logos/${user.id}/${Date.now()}-logo.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from("client-assets")
          .upload(path, logoFile)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("client-assets")
            .getPublicUrl(path)
          logoUrl = urlData.publicUrl
        }
      }

      // 4. Insert organization
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(),
          created_by: user.id,
          logo_url: logoUrl,
          email: email.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          industry: industry || null,
          size: size || null,
          country: country || null,
          state: state || null,
        })
        .select("id")
        .single()

      if (orgError || !newOrg) {
        setError(orgError?.message || "Failed to create organization")
        setIsCreating(false)
        return
      }

      // 5. Add current user as owner in organization_members
      const { error: memberError } = await supabase
        .from("organization_members")
        .upsert(
          {
            organization_id: newOrg.id,
            user_id: user.id,
            role: "owner",
            name: userName,
            email: user.email || "",
          },
          { onConflict: "organization_id,user_id" }
        )

      if (memberError) {
        console.error("Failed to add owner membership:", memberError)
        // Don't block — org was still created
      }

      // 6. Auto-switch to the new organization
      const switchResult = await switchOrganization(newOrg.id)
      if (!switchResult.success) {
        console.error("Failed to auto-switch:", switchResult.error)
      }

      // 7. Close dialog and refresh page
      onClose()
      router.refresh()
    } catch (err) {
      console.error("Unexpected error creating organization:", err)
      setError("Something went wrong. Please try again.")
      setIsCreating(false)
    }
  }

  if (!open) return null

  const stateOptions = country ? stateOptionsByCountry[country] || [] : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#333] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Creating Animation Overlay */}
        {isCreating && (
          <div className="absolute inset-0 z-10 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-[#5C6ECD]/20 animate-ping" />
              <div
                className="absolute inset-2 rounded-full border-4 border-[#5C6ECD]/30 animate-ping"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="absolute inset-4 rounded-full border-4 border-[#5C6ECD]/40 animate-ping"
                style={{ animationDelay: "0.4s" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-gradient-to-br from-[#5C6ECD] to-[#4A5BC7] rounded-full flex items-center justify-center shadow-lg shadow-[#5C6ECD]/30 animate-pulse">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-[#1a1a1a] dark:text-white mb-2 animate-pulse">
              Creating your organization...
            </h2>
            <p className="text-sm text-[#666] dark:text-[#999]">
              Setting up workspace and permissions
            </p>
            <div className="flex gap-1.5 mt-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#5C6ECD] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5] dark:border-[#333] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5C6ECD] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">
                Create Organization
              </h2>
              <p className="text-xs text-[#7a7a7a] dark:text-[#999]">
                Set up a new workspace for your team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="w-4 h-4 text-[#7a7a7a]" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ── Section: Basic Info ── */}
          <div>
            <SectionLabel
              icon={<Building2 className="w-3.5 h-3.5 text-[#7a7a7a]" />}
              label="Basic Information"
            />

            {/* Organization Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                Organization Name{" "}
                <span className="text-[#5C6ECD] font-normal">*</span>
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="e.g. Acme Design Studio"
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors text-sm"
                autoFocus
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                Logo
              </label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-[#e5e5e5] dark:border-[#444] overflow-hidden bg-[#f5f5f5] dark:bg-[#2a2a2a] shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-sm text-[#5C6ECD] hover:text-[#4A5BC7] font-medium"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-sm text-[#7a7a7a] hover:text-red-500 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-[#e5e5e5] dark:border-[#444] rounded-xl hover:border-[#5C6ECD]/50 hover:bg-[#5C6ECD]/5 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#5C6ECD]/10 transition-colors">
                    <ImageIcon className="w-5 h-5 text-[#999] group-hover:text-[#5C6ECD] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#7a7a7a] dark:text-[#999] group-hover:text-[#5C6ECD] transition-colors">
                      Upload logo
                    </p>
                    <p className="text-xs text-[#bbb] dark:text-[#666]">
                      PNG, JPG, SVG up to 2MB
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* ── Section: Contact Info ── */}
          <div>
            <SectionLabel
              icon={<Mail className="w-3.5 h-3.5 text-[#7a7a7a]" />}
              label="Contact Information"
            />

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@yourcompany.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Phone + Website row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourcompany.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Organization Details ── */}
          <div>
            <SectionLabel
              icon={<Users className="w-3.5 h-3.5 text-[#7a7a7a]" />}
              label="Organization Details"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                  Industry
                </label>
                <FormDropdown
                  id="industry"
                  value={industry}
                  options={industryOptions}
                  placeholder="Select industry"
                  onChange={setIndustry}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                  Organization Size
                </label>
                <FormDropdown
                  id="size"
                  value={size}
                  options={sizeOptions}
                  placeholder="Select size"
                  onChange={setSize}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Location ── */}
          <div>
            <SectionLabel
              icon={<MapPin className="w-3.5 h-3.5 text-[#7a7a7a]" />}
              label="Location"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                  Country
                </label>
                <FormDropdown
                  id="country"
                  value={country}
                  options={countryOptions}
                  placeholder="Select country"
                  onChange={setCountry}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                  State
                </label>
                <FormDropdown
                  id="state"
                  value={state}
                  options={stateOptions}
                  placeholder={
                    country ? "Select state" : "Select country first"
                  }
                  onChange={setState}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e5e5e5] dark:border-[#333] bg-[#fafafa] dark:bg-[#111] shrink-0">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="h-10 px-5 rounded-lg border border-[#d9d9d9] dark:border-[#444] text-[#1a1a1a] dark:text-white text-sm font-medium hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!orgName.trim() || isCreating}
            className="h-10 px-5 rounded-lg bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                Create Organization
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
