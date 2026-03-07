"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Plus, Upload, X, Image as ImageIcon, Pencil, Trash2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface Contact {
  id: string
  name: string
  email: string
  countryCode: string
  phone: string
  whatsapp: boolean
}

interface SocialLink {
  id: string
  platform: string
  url: string
}

interface ColorRow {
  id: string
  hex: string
  font: string
  name: string
}

interface FontRow {
  id: string
  label: string
  font: string
}

interface CustomFont {
  name: string
  file: File
}

export interface ClientFormData {
  // Step 1: Brand Info
  brandName: string
  industry: string
  websiteUrl: string
  officeAddress: string
  socialLinks: SocialLink[]
  // Step 2: Contact Details
  contacts: Contact[]
  sameAsOffice: boolean
  contactAddress: string
  whatsappEnabled: boolean
  // Step 3: Brand Assets
  logo: File | null
  logoPreview: string
  fontRows: FontRow[]
  customFonts: CustomFont[]
  brandImages: string[]
  colorRows: ColorRow[]
}

interface FormErrors {
  brandName?: string
  industry?: string
  websiteUrl?: string
  contactNames?: Record<string, string>
  contactEmails?: Record<string, string>
  contactPhones?: Record<string, string>
  socialUrls?: Record<string, string>
  hexColors?: Record<string, string>
}

// Validation helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\d{10}$/
const urlRegex = /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(\/[\w\-./?%&=@#]*)?$/i

// Data
const industries = [
  "Graphic Designing",
  "Web Development",
  "Marketing Agency",
  "Photography",
  "Video Production",
  "UI/UX Design",
  "Branding",
  "Advertising",
  "E-commerce",
  "Consulting",
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Other"
]

const countryCodes = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "USA" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
  { code: "+33", flag: "🇫🇷", country: "France" },
  { code: "+81", flag: "🇯🇵", country: "Japan" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
]

const fonts = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Source Sans Pro",
  "Nunito",
  "Playfair Display",
  "DM Sans",
  "Space Grotesk"
]

const defaultSocialLinks: SocialLink[] = [
  { id: "1", platform: "Instagram", url: "" },
  { id: "2", platform: "Facebook", url: "" },
  { id: "3", platform: "LinkedIn", url: "" },
]

const socialPlatforms = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "TikTok", "Pinterest", "Behance", "Dribbble"]

const platformPrefixes: Record<string, string> = {
  Instagram: "instagram.com/",
  Facebook: "facebook.com/",
  LinkedIn: "linkedin.com/in/",
  Twitter: "x.com/",
  YouTube: "youtube.com/@",
  TikTok: "tiktok.com/@",
  Pinterest: "pinterest.com/",
  Behance: "behance.net/",
  Dribbble: "dribbble.com/",
}

interface NewClientOnboardingProps {
  open: boolean
  onClose: () => void
  onComplete: (data: ClientFormData) => void
  editMode?: boolean
  initialData?: Partial<ClientFormData>
}

export function NewClientOnboarding({ open, onClose, onComplete, editMode = false, initialData }: NewClientOnboardingProps) {
  const [step, setStep] = useState(1)
  const totalSteps = 3
  const logoInputRef = useRef<HTMLInputElement>(null)
  const brandImageInputRef = useRef<HTMLInputElement>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const defaultFormData: ClientFormData = {
    brandName: "",
    industry: "",
    websiteUrl: "",
    officeAddress: "",
    socialLinks: [...defaultSocialLinks],
    contacts: [{ id: "1", name: "", email: "", countryCode: "+91", phone: "", whatsapp: true }],
    sameAsOffice: true,
    contactAddress: "",
    whatsappEnabled: false,
    logo: null,
    logoPreview: "",
    fontRows: [
      { id: "1", label: "Primary", font: "" },
      { id: "2", label: "Secondary", font: "" },
    ],
    customFonts: [],
    brandImages: [],
    colorRows: [
      { id: "1", hex: "", font: "", name: "" },
      { id: "2", hex: "", font: "", name: "" },
      { id: "3", hex: "", font: "", name: "" },
      { id: "4", hex: "", font: "", name: "" },
    ],
  }

  const [formData, setFormData] = useState<ClientFormData>(
    initialData ? { ...defaultFormData, ...initialData } : defaultFormData
  )

  // Reset form when dialog opens with new initialData
  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...defaultFormData, ...initialData } : defaultFormData)
      setStep(1)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [errors, setErrors] = useState<FormErrors>({})

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [socialPopoverOpen, setSocialPopoverOpen] = useState<string | null>(null)
  const fontUploadRef = useRef<HTMLInputElement>(null)
  const [officeSuggestions, setOfficeSuggestions] = useState<{ placeId: string; text: string }[]>([])
  const [contactSuggestions, setContactSuggestions] = useState<{ placeId: string; text: string }[]>([])
  const [showOfficeSuggestions, setShowOfficeSuggestions] = useState(false)
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  const officeWrapperRef = useRef<HTMLDivElement>(null)
  const contactWrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) return
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) return

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (officeWrapperRef.current && !officeWrapperRef.current.contains(e.target as Node)) {
        setShowOfficeSuggestions(false)
      }
      if (contactWrapperRef.current && !contactWrapperRef.current.contains(e.target as Node)) {
        setShowContactSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = (
    input: string,
    setSuggestions: typeof setOfficeSuggestions,
    setShow: typeof setShowOfficeSuggestions
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!input || input.length < 3) {
      setSuggestions([])
      setShow(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = window.google as any
        const { Place } = await google.maps.importLibrary("places")
        const request = {
          textQuery: input,
          fields: ['displayName', 'formattedAddress', 'id'],
          maxResultCount: 5,
        }
        const { places } = await Place.searchByText(request)
        if (places && places.length > 0) {
          setSuggestions(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            places.map((p: any) => ({
              placeId: p.id || '',
              text: p.formattedAddress || p.displayName || '',
            }))
          )
          setShow(true)
        } else {
          setSuggestions([])
          setShow(false)
        }
      } catch {
        setSuggestions([])
        setShow(false)
      }
    }, 300)
  }

  // Close dropdown/popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && !(e.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
      if (socialPopoverOpen && !(e.target as Element).closest('.social-popover-container')) {
        setSocialPopoverOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, socialPopoverOpen])

  // Get all available fonts (base + custom) for the font selection dropdown
  const getAllFonts = () => {
    const customFontNames = formData.customFonts.map(f => f.name)
    return [...fonts, ...customFontNames]
  }

  // Get font row labels for the Brand Colors font dropdown
  const getFontRowLabels = () => {
    return formData.fontRows.map(row => row.label)
  }

  // Update font row label
  const updateFontRowLabel = (id: string, label: string) => {
    setFormData(prev => ({
      ...prev,
      fontRows: prev.fontRows.map(f =>
        f.id === id ? { ...f, label } : f
      )
    }))
  }

  // Clear a specific field error when user types
  const clearError = (field: keyof FormErrors) => {
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const clearNestedError = (field: 'contactNames' | 'contactEmails' | 'contactPhones' | 'socialUrls' | 'hexColors', id: string) => {
    setErrors(prev => {
      const nested = { ...prev[field] }
      if (nested) delete nested[id]
      const isEmpty = Object.keys(nested).length === 0
      const next = { ...prev }
      if (isEmpty) delete next[field]
      else next[field] = nested
      return next
    })
  }

  const validateStep = (currentStep: number): FormErrors => {
    const newErrors: FormErrors = {}

    if (currentStep === 1) {
      if (!formData.brandName.trim()) {
        newErrors.brandName = "Brand name is required"
      }
      if (!formData.industry) {
        newErrors.industry = "Please select an industry"
      }
      if (formData.websiteUrl.trim() && !urlRegex.test(formData.websiteUrl.trim())) {
        newErrors.websiteUrl = "Please enter a valid URL"
      }
      // Validate social usernames (no spaces, no full URLs)
      const socialErrors: Record<string, string> = {}
      formData.socialLinks.forEach(link => {
        if (link.url.trim() && /\s/.test(link.url.trim())) {
          socialErrors[link.id] = "Username should not contain spaces"
        }
      })
      if (Object.keys(socialErrors).length > 0) newErrors.socialUrls = socialErrors
    }

    if (currentStep === 2) {
      const nameErrors: Record<string, string> = {}
      const emailErrors: Record<string, string> = {}
      const phoneErrors: Record<string, string> = {}

      // First contact is required
      const first = formData.contacts[0]
      if (first) {
        if (!first.name.trim()) nameErrors[first.id] = "Contact name is required"
        if (!first.email.trim()) {
          emailErrors[first.id] = "Email is required"
        } else if (!emailRegex.test(first.email.trim())) {
          emailErrors[first.id] = "Please enter a valid email"
        }
        if (first.phone.trim() && !phoneRegex.test(first.phone.trim())) {
          phoneErrors[first.id] = "Phone number must be 10 digits"
        }
      }

      // Additional contacts - validate only filled ones
      formData.contacts.slice(1).forEach(c => {
        if (c.email.trim() && !emailRegex.test(c.email.trim())) {
          emailErrors[c.id] = "Please enter a valid email"
        }
        if (c.phone.trim() && !phoneRegex.test(c.phone.trim())) {
          phoneErrors[c.id] = "Phone number must be 10 digits"
        }
      })

      if (Object.keys(nameErrors).length > 0) newErrors.contactNames = nameErrors
      if (Object.keys(emailErrors).length > 0) newErrors.contactEmails = emailErrors
      if (Object.keys(phoneErrors).length > 0) newErrors.contactPhones = phoneErrors
    }

    if (currentStep === 3) {
      const hexErrors: Record<string, string> = {}
      formData.colorRows.forEach(row => {
        if (row.hex.trim() && !/^[0-9a-fA-F]{3,6}$/.test(row.hex.trim())) {
          hexErrors[row.id] = "Invalid hex"
        }
      })
      if (Object.keys(hexErrors).length > 0) newErrors.hexColors = hexErrors
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
        return formData.brandName.trim() !== "" && formData.industry !== ""
      case 2:
        return formData.contacts[0]?.name.trim() !== "" && formData.contacts[0]?.email.trim() !== ""
      case 3:
        return true
      default:
        return true
    }
  }

  // Handle "Same as office" checkbox
  const handleSameAsOffice = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAsOffice: checked
    }))
  }

  // Add functions
  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        { id: Date.now().toString(), platform: "Twitter", url: "" }
      ]
    }))
  }

  const removeSocialLink = (id: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter(s => s.id !== id)
    }))
  }

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { id: Date.now().toString(), name: "", email: "", countryCode: "+91", phone: "", whatsapp: true }
      ]
    }))
  }

  const removeContact = (id: string) => {
    if (formData.contacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== id)
      }))
    }
  }

  const addColorRow = () => {
    setFormData(prev => ({
      ...prev,
      colorRows: [
        ...prev.colorRows,
        { id: Date.now().toString(), hex: "", font: "", name: "" }
      ]
    }))
  }

  const removeColorRow = (id: string) => {
    if (formData.colorRows.length > 1) {
      setFormData(prev => ({
        ...prev,
        colorRows: prev.colorRows.filter(c => c.id !== id)
      }))
    }
  }

  const addFontRow = () => {
    const newIndex = formData.fontRows.length + 1
    setFormData(prev => ({
      ...prev,
      fontRows: [
        ...prev.fontRows,
        { id: Date.now().toString(), label: `Font ${newIndex}`, font: "" }
      ]
    }))
  }

  const removeFontRow = (id: string) => {
    if (formData.fontRows.length > 2) {
      setFormData(prev => ({
        ...prev,
        fontRows: prev.fontRows.filter(f => f.id !== id)
      }))
    }
  }

  const updateFontRow = (id: string, font: string) => {
    setFormData(prev => ({
      ...prev,
      fontRows: prev.fontRows.map(f =>
        f.id === id ? { ...f, font } : f
      )
    }))
  }

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const fontName = file.name.replace(/\.(ttf|otf)$/i, '')
        setFormData(prev => ({
          ...prev,
          customFonts: [...prev.customFonts, { name: fontName, file }]
        }))
      })
    }
    // Reset input
    if (e.target) e.target.value = ''
  }

  // Update functions
  const updateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      )
    }))
  }

  const updateContact = (id: string, field: keyof Contact, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }))
  }

  const updateColorRow = (id: string, field: keyof ColorRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      colorRows: prev.colorRows.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }))
  }

  // File handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          logo: file,
          logoPreview: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBrandImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFormData(prev => ({
            ...prev,
            brandImages: [...prev.brandImages, e.target?.result as string]
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeBrandImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandImages: prev.brandImages.filter((_, i) => i !== index)
    }))
    if (currentImageIndex >= formData.brandImages.length - 1) {
      setCurrentImageIndex(Math.max(0, formData.brandImages.length - 2))
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
    borderless = false
  }: {
    id: string
    value: string
    options: string[]
    placeholder: string
    onChange: (value: string) => void
    disabled?: boolean
    borderless?: boolean
  }) => (
    <div className="relative dropdown-container" style={{ zIndex: dropdownOpen === id ? 9999 : 30 }}>
      <button
        type="button"
        onClick={() => !disabled && setDropdownOpen(dropdownOpen === id ? null : id)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
          borderless
            ? "border-none bg-transparent"
            : "border",
          !borderless && (disabled
            ? "bg-[#f5f5f5] dark:bg-[#2a2a2a] border-[#e5e5e5] dark:border-[#444] cursor-not-allowed"
            : dropdownOpen === id
            ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-[#1a1a1a]"
            : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-[#1a1a1a] hover:border-[#5C6ECD]/50"),
          borderless && disabled && "cursor-not-allowed opacity-50"
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90vw] h-[90vh] bg-white dark:bg-[#0a0a0a] flex flex-col shadow-2xl">
      {/* Header */}
      <header className="px-8 py-5 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
        <div className="flex items-center justify-between">
          {/* Revue Logo */}
          <div className="flex items-center">
            <img src="/Logo/Artboard 8@2x.png" alt="Revue" width={120} height={37} className="dark:hidden" />
            <img src="/Logo/Artboard 8 copy@2x.png" alt="Revue" width={120} height={37} className="hidden dark:block" />
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center gap-6">
            {[
              { num: 1, label: "Brand Info" },
              { num: 2, label: "Contact Details" },
              { num: 3, label: "Brand Assets" }
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
                {i < 2 && (
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
        <div className={cn(
          "w-full mx-auto",
          step === 3 ? "max-w-4xl" : "max-w-2xl"
        )}>
          {/* Step 1: Brand Information */}
          {step === 1 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">1</span>
                  Brand Info
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Tell us about the brand
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Basic information to get started with your new client
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {/* Brand Name & Industry */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Brand Name <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, brandName: e.target.value }))
                        clearError('brandName')
                      }}
                      placeholder="Enter brand name"
                      className={cn(
                        "w-full px-4 py-3 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                        errors.brandName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                      )}
                    />
                    {errors.brandName && <p className="text-xs text-red-500 mt-1">{errors.brandName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                      Industry <span className="text-[#5C6ECD] font-normal">*</span>
                    </label>
                    <CustomDropdown
                      id="industry"
                      value={formData.industry}
                      options={industries}
                      placeholder="Select industry"
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, industry: value }))
                        clearError('industry')
                      }}
                    />
                    {errors.industry && <p className="text-xs text-red-500 mt-1">{errors.industry}</p>}
                  </div>
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))
                      clearError('websiteUrl')
                    }}
                    placeholder="https://example.com"
                    className={cn(
                      "w-full px-4 py-3 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                      errors.websiteUrl
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                    )}
                  />
                  {errors.websiteUrl && <p className="text-xs text-red-500 mt-1">{errors.websiteUrl}</p>}
                </div>

                {/* Office Location */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Office Location</h3>
                  <div ref={officeWrapperRef} className="relative">
                    <input
                      type="text"
                      value={formData.officeAddress}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, officeAddress: e.target.value }))
                        fetchSuggestions(e.target.value, setOfficeSuggestions, setShowOfficeSuggestions)
                      }}
                      onFocus={() => { if (officeSuggestions.length > 0) setShowOfficeSuggestions(true) }}
                      placeholder="Start typing address..."
                      className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                    />
                    {showOfficeSuggestions && officeSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] rounded-lg shadow-lg max-h-48 overflow-auto">
                        {officeSuggestions.map((s) => (
                          <li
                            key={s.placeId}
                            className="px-4 py-2.5 text-sm text-[#1a1a1a] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#333] cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, officeAddress: s.text }))
                              setShowOfficeSuggestions(false)
                            }}
                          >
                            {s.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Social Media Links</h3>

                  <div className="space-y-3">
                    {formData.socialLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-3">
                        {/* Social Platform Selector with Popover */}
                        <div className="relative social-popover-container">
                          <button
                            type="button"
                            onClick={() => setSocialPopoverOpen(socialPopoverOpen === link.id ? null : link.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-colors min-w-[140px]",
                              socialPopoverOpen === link.id
                                ? "border-[#5C6ECD] ring-2 ring-[#5C6ECD]/20 bg-white dark:bg-transparent"
                                : "border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent hover:border-[#5C6ECD]/50"
                            )}
                          >
                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                              {link.platform === "Instagram" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                              {link.platform === "Facebook" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                              {link.platform === "LinkedIn" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
                              {link.platform === "Twitter" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                              {link.platform === "YouTube" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                              {link.platform === "TikTok" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>}
                              {link.platform === "Pinterest" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>}
                              {link.platform === "Behance" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938v-.007zM6.545 9.64c.55 0 .993-.138 1.35-.41.35-.27.525-.68.525-1.22 0-.3-.06-.55-.168-.75-.11-.2-.26-.36-.44-.478-.186-.12-.398-.2-.64-.237-.24-.04-.49-.06-.752-.06H3.464V9.64h3.08zm.197 5.59c.29 0 .57-.03.84-.09.27-.058.51-.15.72-.28.21-.13.378-.31.504-.53.126-.22.19-.5.19-.85 0-.67-.2-1.14-.594-1.42-.396-.28-.93-.42-1.6-.42H3.465v3.59h3.277z"/></svg>}
                              {link.platform === "Dribbble" && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87z"/></svg>}
                            </div>
                            <span className="text-sm text-[#1a1a1a] dark:text-white">{link.platform}</span>
                            <ChevronDown className={cn("w-4 h-4 text-[#999] ml-auto transition-transform", socialPopoverOpen === link.id && "rotate-180")} />
                          </button>
                          {/* Popover */}
                          {socialPopoverOpen === link.id && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] shadow-xl z-[9999] py-1">
                              {socialPlatforms.map((platform) => (
                                <button
                                  key={platform}
                                  type="button"
                                  onClick={() => {
                                    updateSocialLink(link.id, 'platform', platform)
                                    setSocialPopoverOpen(null)
                                  }}
                                  className={cn(
                                    "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#5C6ECD]/10 transition-colors",
                                    link.platform === platform && "bg-[#5C6ECD]/10 text-[#5C6ECD]"
                                  )}
                                >
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    {platform === "Instagram" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/></svg>}
                                    {platform === "Facebook" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                                    {platform === "LinkedIn" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>}
                                    {platform === "Twitter" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                                    {platform === "YouTube" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/></svg>}
                                    {platform === "TikTok" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>}
                                    {platform === "Pinterest" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>}
                                    {platform === "Behance" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938v-.007z"/></svg>}
                                    {platform === "Dribbble" && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12z"/></svg>}
                                  </div>
                                  <span className={link.platform === platform ? "text-[#5C6ECD] font-medium" : "text-[#1a1a1a] dark:text-white"}>{platform}</span>
                                  {link.platform === platform && <Check className="w-4 h-4 text-[#5C6ECD] ml-auto" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={cn(
                            "flex items-center border rounded-lg bg-white dark:bg-transparent transition-colors",
                            errors.socialUrls?.[link.id]
                              ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                              : "border-[#e5e5e5] dark:border-[#444] focus-within:border-[#5C6ECD] focus-within:ring-2 focus-within:ring-[#5C6ECD]/20"
                          )}>
                            <span className="pl-4 pr-1 py-3 text-sm text-[#999] dark:text-[#666] whitespace-nowrap select-none">
                              {platformPrefixes[link.platform] || `${link.platform.toLowerCase()}.com/`}
                            </span>
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => {
                                updateSocialLink(link.id, 'url', e.target.value)
                                clearNestedError('socialUrls', link.id)
                              }}
                              placeholder="username"
                              className="flex-1 py-3 pr-4 bg-transparent border-none text-[#1a1a1a] dark:text-white placeholder:text-[#999] !outline-none"
                            />
                          </div>
                          {errors.socialUrls?.[link.id] && <p className="text-xs text-red-500 mt-1">{errors.socialUrls[link.id]}</p>}
                        </div>
                        {formData.socialLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSocialLink(link.id)}
                            className="p-2 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-[#5C6ECD] hover:text-[#4A5BC7] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add more
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {step === 2 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">2</span>
                  Contact Details
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Who should we contact?
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Add the primary contact person for this client
                </p>
              </div>

              <div className="space-y-6 overflow-visible">
                {formData.contacts.map((contact, index) => (
                  <div key={contact.id} className={cn(
                    "space-y-4",
                    index > 0 && "pt-6 border-t border-[#e5e5e5] dark:border-[#333]"
                  )}>
                    {index > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
                          Contact {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="text-sm text-red-500 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                        Name {index === 0 && <span className="text-[#5C6ECD] font-normal">*</span>}
                      </label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => {
                          updateContact(contact.id, 'name', e.target.value)
                          clearNestedError('contactNames', contact.id)
                        }}
                        placeholder="Enter contact name"
                        className={cn(
                          "w-full px-4 py-3 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                          errors.contactNames?.[contact.id]
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                        )}
                      />
                      {errors.contactNames?.[contact.id] && <p className="text-xs text-red-500 mt-1">{errors.contactNames[contact.id]}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                        Email {index === 0 && <span className="text-[#5C6ECD] font-normal">*</span>}
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => {
                          updateContact(contact.id, 'email', e.target.value)
                          clearNestedError('contactEmails', contact.id)
                        }}
                        placeholder="Enter email address"
                        className={cn(
                          "w-full px-4 py-3 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors",
                          errors.contactEmails?.[contact.id]
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                        )}
                      />
                      {errors.contactEmails?.[contact.id] && <p className="text-xs text-red-500 mt-1">{errors.contactEmails[contact.id]}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                        Phone Number
                      </label>
                      <div className={cn(
                        "flex items-center border rounded-lg bg-white dark:bg-transparent transition-colors",
                        errors.contactPhones?.[contact.id]
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                          : "border-[#e5e5e5] dark:border-[#444] focus-within:border-[#5C6ECD] focus-within:ring-2 focus-within:ring-[#5C6ECD]/20"
                      )}>
                        <div className="w-[120px] shrink-0">
                          <CustomDropdown
                            id={`countryCode-${contact.id}`}
                            value={countryCodes.find(c => c.code === contact.countryCode)?.flag + " " + contact.countryCode || contact.countryCode}
                            options={countryCodes.map(c => `${c.flag} ${c.code}`)}
                            placeholder="Code"
                            borderless
                            onChange={(value) => {
                              const code = value.split(" ").pop() || "+91"
                              updateContact(contact.id, 'countryCode', code)
                            }}
                          />
                        </div>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '')
                            updateContact(contact.id, 'phone', digits)
                            clearNestedError('contactPhones', contact.id)
                          }}
                          placeholder="Enter phone number"
                          className="flex-1 px-4 py-3 bg-transparent border-none text-[#1a1a1a] dark:text-white placeholder:text-[#999] !outline-none"
                        />
                      </div>
                      {errors.contactPhones?.[contact.id] && <p className="text-xs text-red-500 mt-1">{errors.contactPhones[contact.id]}</p>}
                      <label className="flex items-center gap-2.5 mt-2.5 cursor-pointer select-none">
                        <button
                          type="button"
                          onClick={() => updateContact(contact.id, 'whatsapp', !contact.whatsapp)}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors shrink-0",
                            contact.whatsapp ? "bg-[#25D366]" : "bg-[#ccc] dark:bg-[#555]"
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                            contact.whatsapp && "translate-x-4"
                          )} />
                        </button>
                        <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span className="text-sm text-[#666] dark:text-[#aaa]">Send updates via WhatsApp</span>
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 text-sm font-medium text-[#5C6ECD] hover:text-[#4A5BC7] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add another contact
                </button>

                {/* Contact Location */}
                <div className="pt-6 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Location</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="sameAsOffice"
                      checked={formData.sameAsOffice}
                      onChange={(e) => handleSameAsOffice(e.target.checked)}
                      className="w-4 h-4border-[#e5e5e5] dark:border-[#444] text-[#5C6ECD] focus:ring-[#5C6ECD] focus:ring-offset-0 accent-[#5C6ECD]"
                    />
                    <label htmlFor="sameAsOffice" className="text-sm text-[#666] dark:text-[#999] cursor-pointer select-none">
                      Same as office address
                    </label>
                  </div>
                  {!formData.sameAsOffice && (
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] dark:text-white mb-2">
                        Contact Address
                      </label>
                      <div ref={contactWrapperRef} className="relative">
                        <input
                          type="text"
                          value={formData.contactAddress || ""}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, contactAddress: e.target.value }))
                            fetchSuggestions(e.target.value, setContactSuggestions, setShowContactSuggestions)
                          }}
                          onFocus={() => { if (contactSuggestions.length > 0) setShowContactSuggestions(true) }}
                          placeholder="Start typing address..."
                          className="w-full px-4 py-3 border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors"
                        />
                        {showContactSuggestions && contactSuggestions.length > 0 && (
                          <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#444] rounded-lg shadow-lg max-h-48 overflow-auto">
                            {contactSuggestions.map((s) => (
                              <li
                                key={s.placeId}
                                className="px-4 py-2.5 text-sm text-[#1a1a1a] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#333] cursor-pointer"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, contactAddress: s.text }))
                                  setShowContactSuggestions(false)
                                }}
                              >
                                {s.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="text-xs text-[#999] mt-2">Enter full address including city, state and country</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Brand Assets */}
          {step === 3 && (
            <div>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5C6ECD]/10 text-[#5C6ECD] text-sm font-medium mb-4">
                  <span className="w-5 h-5 rounded-full bg-[#5C6ECD] text-white text-xs flex items-center justify-center">3</span>
                  Brand Assets
                </div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-2">
                  Upload brand assets
                </h1>
                <p className="text-[#666] dark:text-[#999]">
                  Add logo, fonts and colors to set up the brand identity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-12">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Logo Upload */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Logo</h3>
                  <div className="flex items-center gap-3">
                    {formData.logoPreview ? (
                      <div className="relative w-16 h-16 border border-[#e5e5e5] dark:border-[#444] overflow-hidden shrink-0">
                        <img
                          src={formData.logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, logo: null, logoPreview: "" }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="w-16 h-16 border-2 border-dashed border-[#e5e5e5] dark:border-[#444] flex items-center justify-center cursor-pointer hover:border-[#5C6ECD] hover:bg-[#5C6ECD]/5 transition-colors shrink-0 group"
                      >
                        <Upload className="w-5 h-5 text-[#999] group-hover:text-[#5C6ECD] transition-colors" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        readOnly
                        placeholder="No file selected"
                        value={formData.logo?.name || ""}
                        className="w-full px-3 py-2.5 border border-[#e5e5e5] dark:border-[#444] bg-[#f9f9f9] dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none text-sm"
                      />
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2.5 border border-[#5C6ECD] text-[#5C6ECD] font-medium text-sm hover:bg-[#5C6ECD] hover:text-white transition-colors"
                    >
                      Upload
                    </button>
                  </div>
                </div>

                {/* Brand Fonts */}
                <div className="pt-8 border-t border-[#e5e5e5] dark:border-[#333]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Brand Fonts</h3>
                  <div className="space-y-3 mb-3">
                    {formData.fontRows.map((row, index) => (
                      <div key={row.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          {index <= 1 ? (
                            <label className="block text-xs text-[#666] dark:text-[#999] mb-2">
                              {row.label}
                            </label>
                          ) : (
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) => updateFontRowLabel(row.id, e.target.value)}
                              placeholder="Font name"
                              className="block text-xs text-[#666] dark:text-[#999] mb-2 bg-transparent border-none outline-none focus:text-[#5C6ECD] w-full"
                            />
                          )}
                          <CustomDropdown
                            id={`font-${row.id}`}
                            value={row.font}
                            options={getAllFonts()}
                            placeholder="Select Font"
                            onChange={(value) => updateFontRow(row.id, value)}
                          />
                        </div>
                        {index > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFontRow(row.id)}
                            className="p-2 text-[#999] hover:text-red-500 transition-colors mt-6"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#999] mb-4">
                    You can upload your font if it is not listed on google fonts<br />
                    Supported formats .TTF & .OTF
                  </p>
                  {formData.customFonts.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-[#666] dark:text-[#999] mb-2">Uploaded fonts:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.customFonts.map((font, i) => (
                          <span key={i} className="px-2 py-1 bg-[#5C6ECD]/10 text-[#5C6ECD] text-xs">
                            {font.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addFontRow}
                      className="w-9 h-9 flex items-center justify-center bg-black text-white hover:bg-black/80 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fontUploadRef.current?.click()}
                      className="px-4 py-2 bg-[#5C6ECD] text-white text-sm font-medium hover:bg-[#4A5BC7] transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      UPLOAD YOUR FONT
                    </button>
                    <input
                      ref={fontUploadRef}
                      type="file"
                      accept=".ttf,.otf"
                      multiple
                      onChange={handleCustomFontUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Brand Colors */}
              <div>
                <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-4">Brand Colors</h3>

                <div className="space-y-6">
                  {/* Image Upload Area */}
                  <div>
                    {formData.brandImages.length > 0 ? (
                      <div>
                        <div className="relative aspect-[16/9] overflow-hidden border border-[#e5e5e5] dark:border-[#444]">
                          <img
                            src={formData.brandImages[currentImageIndex]}
                            alt="Brand colors"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeBrandImage(currentImageIndex)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {formData.brandImages.length > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-3">
                            {formData.brandImages.map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setCurrentImageIndex(index)}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  index === currentImageIndex
                                    ? "bg-[#1a1a1a] dark:bg-white"
                                    : "bg-[#e5e5e5] dark:bg-[#444]"
                                )}
                              />
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => brandImageInputRef.current?.click()}
                          className="w-full mt-3 py-2 text-sm font-medium text-[#5C6ECD] hover:text-[#4A5BC7] transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add more images
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => brandImageInputRef.current?.click()}
                        className="w-full aspect-[16/9] border-2 border-dashed border-[#e5e5e5] dark:border-[#444] flex flex-col items-center justify-center gap-2 text-[#999] hover:border-[#5C6ECD] hover:bg-[#5C6ECD]/5 hover:text-[#5C6ECD] transition-colors group"
                      >
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Browse media</span>
                        <span className="text-xs">Upload to extract colors</span>
                      </button>
                    )}
                    <input
                      ref={brandImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBrandImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Color Rows */}
                  <div className="space-y-3">
                    {formData.colorRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-3">
                        {/* Color Input */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#999]">#</span>
                          <div>
                            <input
                              type="text"
                              value={row.hex}
                              onChange={(e) => {
                                // Only allow hex characters
                                const hex = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
                                updateColorRow(row.id, 'hex', hex)
                                clearNestedError('hexColors', row.id)
                              }}
                              placeholder="000000"
                              className={cn(
                                "w-16 px-2 py-2 border bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:ring-2 transition-colors font-mono text-xs",
                                errors.hexColors?.[row.id]
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-[#e5e5e5] dark:border-[#444] focus:border-[#5C6ECD] focus:ring-[#5C6ECD]/20"
                              )}
                              maxLength={6}
                            />
                            {errors.hexColors?.[row.id] && <p className="text-xs text-red-500 mt-0.5">{errors.hexColors[row.id]}</p>}
                          </div>
                          <div className="relative">
                            <input
                              type="color"
                              value={row.hex ? `#${row.hex}` : "#000000"}
                              onChange={(e) => updateColorRow(row.id, 'hex', e.target.value.replace("#", ""))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[100]"
                            />
                            <div
                              className="w-7 h-7 rounded-full border border-[#e5e5e5] dark:border-[#444] flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ backgroundColor: row.hex ? `#${row.hex}` : '#f5f5f5' }}
                            >
                              <Pencil className="w-2.5 h-2.5 text-white mix-blend-difference" />
                            </div>
                          </div>
                        </div>

                        {/* Font Select */}
                        <div className="w-36">
                          <CustomDropdown
                            id={`colorFont-${row.id}`}
                            value={row.font}
                            options={getFontRowLabels()}
                            placeholder="Font"
                            onChange={(value) => updateColorRow(row.id, 'font', value)}
                          />
                        </div>

                        {/* Color Name */}
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateColorRow(row.id, 'name', e.target.value)}
                          placeholder="Color name"
                          className="flex-1 px-3 py-2border border-[#e5e5e5] dark:border-[#444] bg-white dark:bg-transparent text-[#1a1a1a] dark:text-white placeholder:text-[#999] outline-none focus:border-[#5C6ECD] focus:ring-2 focus:ring-[#5C6ECD]/20 transition-colors text-sm"
                        />

                        {/* Remove Button */}
                        {formData.colorRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColorRow(row.id)}
                            className="p-1.5 text-[#999] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addColorRow}
                      className="flex items-center gap-2 text-sm font-medium text-[#5C6ECD] hover:text-[#4A5BC7] transition-colors mt-4"
                    >
                      <Plus className="w-4 h-4" />
                      Add row
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] dark:border-[#333] px-8 py-4 shrink-0">
        <div className={cn(
          "flex items-center justify-between mx-auto",
          step === 3 ? "max-w-4xl" : "max-w-2xl"
        )}>
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
            {step === totalSteps ? (editMode ? "Save Changes" : "Add Client") : "Continue"}
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
