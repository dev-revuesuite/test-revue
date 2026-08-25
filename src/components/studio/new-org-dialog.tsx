"use client"

import { useState, useRef, useEffect } from "react"
import { publicPath } from "@/lib/base-path"
import {
  X,
  Sparkles,
  Globe,
  Mail,
  Phone,
  ChevronDown,
  Check,
  ArrowRight,
  ImageIcon,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useOrgSwitch } from "@/contexts/org-switch-context"

interface NewOrganizationDialogProps {
  open: boolean
  onClose: () => void
}

const STEPS = [
  { num: 1, label: "Workspace Info" },
  { num: 2, label: "Contact & Web" },
  { num: 3, label: "Organization Details" },
] as const

const totalSteps = STEPS.length

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

function FormDropdown({
  id,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  id: string
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-sm transition-colors",
          disabled
            ? "bg-[#f5f5f5] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#444] cursor-not-allowed"
            : isOpen
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
      {isOpen && !disabled && (
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

function StepHero({
  step,
  label,
  title,
  subtitle,
}: {
  step: number
  label: string
  title: string
  subtitle: string
}) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
        <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">
          {step}
        </span>
        {label}
      </div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
        {title}
      </h1>
      <p className="text-[#666] dark:text-[#999]">{subtitle}</p>
    </div>
  )
}

export function NewOrganizationDialog({
  open,
  onClose,
}: NewOrganizationDialogProps) {
  const { performOrgSwitch } = useOrgSwitch()

  const [step, setStep] = useState(1)
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

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep(1)
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

  const canContinue = () => {
    if (step === 1) return orgName.trim() !== ""
    return true
  }

  const handlePrevious = () => {
    setError(null)
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required")
      setStep(1)
      return
    }

    setError(null)
    setIsCreating(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError("Unable to get user info. Please try again.")
        setIsCreating(false)
        return
      }

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
      }

      const switched = await performOrgSwitch(newOrg.id)
      if (!switched) {
        console.error("Failed to auto-switch to new organization")
      }

      onClose()
    } catch (err) {
      console.error("Unexpected error creating organization:", err)
      setError("Something went wrong. Please try again.")
      setIsCreating(false)
    }
  }

  const handleNext = () => {
    if (!canContinue()) return
    setError(null)
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      void handleSubmit()
    }
  }

  if (!open) return null

  const stateOptions = country ? stateOptionsByCountry[country] || [] : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90vw] h-[90vh] bg-white dark:bg-[#0a0a0a] flex flex-col shadow-2xl rounded-2xl overflow-hidden">
        <header className="px-8 py-5 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={publicPath("/Logo/Artboard_5.png")}
                alt="Revue"
                width={120}
                height={37}
                className="dark:hidden"
              />
              <img
                src={publicPath("/Logo/Artboard_1.png")}
                alt="Revue"
                width={120}
                height={37}
                className="hidden dark:block"
              />
            </div>

            <div className="flex items-center gap-6">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        step >= s.num
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
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-12 h-0.5 rounded-full transition-colors",
                        step > s.num
                          ? "bg-[#5C6ECD]"
                          : "bg-[#e5e5e5] dark:bg-[#333]"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              disabled={isCreating}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#999] hover:bg-[#f0f0f0] dark:hover:bg-[#333] hover:text-[#5C6ECD] transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-visible px-8 pt-6 pb-8">
          <div className="w-full max-w-2xl mx-auto">
            {error && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <StepHero
                  step={1}
                  label="Workspace Info"
                  title="Set up your workspace"
                  subtitle="Name your organization and add a logo to get started"
                />

                <div className="space-y-6">
                  <div>
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
                        <div className="w-20 h-20 rounded-xl border border-[#e5e5e5] dark:border-[#444] overflow-hidden bg-[#f5f5f5] dark:bg-[#2a2a2a] shrink-0">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-3">
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
                        className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-[#e5e5e5] dark:border-[#444] rounded-xl hover:border-[#5C6ECD] hover:bg-[#5C6ECD]/5 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center group-hover:bg-[#5C6ECD]/20 transition-colors">
                          <ImageIcon className="w-5 h-5 text-[#5C6ECD]" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">
                            Upload logo
                          </p>
                          <p className="text-xs text-[#999]">
                            PNG, JPG, SVG up to 2MB
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHero
                  step={2}
                  label="Contact & Web"
                  title="How can people reach you?"
                  subtitle="Optional contact details for your workspace"
                />

                <div className="space-y-4">
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
                        autoFocus
                      />
                    </div>
                  </div>

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
            )}

            {step === 3 && (
              <div>
                <StepHero
                  step={3}
                  label="Organization Details"
                  title="Tell us about your team"
                  subtitle="Industry, size, and location help personalize your workspace"
                />

                <div className="space-y-4">
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
                        disabled={!country}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-[#e5e5e5] dark:border-[#333] px-8 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isCreating}
                  className="px-6 py-2.5 font-medium text-[#1a1a1a] dark:text-white border border-[#e5e5e5] dark:border-[#444] hover:border-[#5C6ECD] hover:text-[#5C6ECD] transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue() || isCreating}
              className={cn(
                "group flex items-center gap-2 px-8 py-2.5 font-medium transition-all",
                isCreating
                  ? "bg-[#5C6ECD] text-white cursor-wait"
                  : canContinue()
                    ? "bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white shadow-lg shadow-[#5C6ECD]/25"
                    : "bg-[#e5e5e5] dark:bg-[#333] text-[#999] cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {step === totalSteps ? "Create Organization" : "Continue"}
                  <ArrowRight
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      canContinue() && "group-hover:translate-x-1"
                    )}
                  />
                </>
              )}
            </button>
          </div>
        </footer>

        {isCreating && (
          <div className="absolute inset-0 z-[100000] bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
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
      </div>
    </div>
  )
}
