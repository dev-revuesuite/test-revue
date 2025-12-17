"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Plus,
  Upload,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types
interface Contact {
  id: string
  name: string
  email: string
  countryCode: string
  phone: string
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

interface BrandFormData {
  // Step 1: Brand Info
  brandName: string
  industry: string
  websiteUrl: string
  officeAddress: string
  country: string
  state: string
  city: string
  socialLinks: SocialLink[]
  // Step 2: Contact Details
  contacts: Contact[]
  contactCountry: string
  contactState: string
  contactCity: string
  sameAsOffice: boolean
  // Step 3: Brand Assets
  logo: File | null
  logoPreview: string
  primaryFont: string
  secondaryFont: string
  brandImages: string[]
  colorRows: ColorRow[]
}

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
  "Other"
]

const countries = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Singapore",
  "UAE"
]

const indianStates = [
  "Uttar Pradesh",
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Gujarat",
  "Rajasthan",
  "Delhi",
  "West Bengal",
  "Telangana",
  "Kerala"
]

const cities: Record<string, string[]> = {
  "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra", "Varanasi"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli"],
  "Delhi": ["New Delhi", "Central Delhi", "South Delhi", "North Delhi"],
}

const countryCodes = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "USA" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
]

const fonts = [
  "Select Font",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Source Sans Pro",
  "Nunito",
  "Playfair Display"
]

const defaultSocialLinks: SocialLink[] = [
  { id: "1", platform: "Instagram", url: "" },
  { id: "2", platform: "Facebook", url: "" },
  { id: "3", platform: "LinkedIn", url: "" },
]

interface NewClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (data: BrandFormData) => void
}

export function NewClientDialog({ open, onOpenChange, onSave }: NewClientDialogProps) {
  const [step, setStep] = useState(1)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const brandImageInputRef = useRef<HTMLInputElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [formData, setFormData] = useState<BrandFormData>({
    brandName: "",
    industry: "Graphic Designing",
    websiteUrl: "",
    officeAddress: "",
    country: "India",
    state: "Uttar Pradesh",
    city: "Noida",
    socialLinks: [...defaultSocialLinks],
    contacts: [{ id: "1", name: "", email: "", countryCode: "+91", phone: "" }],
    contactCountry: "India",
    contactState: "Uttar Pradesh",
    contactCity: "Noida",
    sameAsOffice: false,
    logo: null,
    logoPreview: "",
    primaryFont: "",
    secondaryFont: "",
    brandImages: [],
    colorRows: [
      { id: "1", hex: "000000", font: "", name: "" },
      { id: "2", hex: "000000", font: "", name: "" },
      { id: "3", hex: "000000", font: "", name: "" },
      { id: "4", hex: "000000", font: "", name: "" },
    ],
  })

  const steps = [
    { number: 1, label: "Brand Info" },
    { number: 2, label: "Contact Details" },
    { number: 3, label: "Brand Assets" },
  ]

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!open || step !== 1) return

    const initAutocomplete = () => {
      const input = document.getElementById("office-address-autocomplete") as HTMLInputElement
      if (!input || !window.google?.maps?.places) return

      // Clean up previous instance
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(input, {
        types: ["address"],
        fields: ["address_components", "formatted_address"],
      })

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (!place?.address_components) return

        let country = ""
        let state = ""
        let city = ""
        const formattedAddress = place.formatted_address || ""

        place.address_components.forEach((component) => {
          const types = component.types
          if (types.includes("country")) {
            country = component.long_name
          }
          if (types.includes("administrative_area_level_1")) {
            state = component.long_name
          }
          if (types.includes("locality") || types.includes("administrative_area_level_2")) {
            if (!city) city = component.long_name
          }
        })

        setFormData((prev) => ({
          ...prev,
          officeAddress: formattedAddress,
          country: countries.includes(country) ? country : prev.country,
          state: indianStates.includes(state) ? state : prev.state,
          city: city || prev.city,
        }))
      })
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      // Load Google Maps script dynamically if not present
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (!existingScript) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = initAutocomplete
        document.head.appendChild(script)
      }
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [open, step])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSave = () => {
    onSave?.(formData)
    onOpenChange(false)
    // Reset form
    setStep(1)
    setFormData({
      brandName: "",
      industry: "Graphic Designing",
      websiteUrl: "",
      officeAddress: "",
      country: "India",
      state: "Uttar Pradesh",
      city: "Noida",
      socialLinks: [...defaultSocialLinks],
      contacts: [{ id: "1", name: "", email: "", countryCode: "+91", phone: "" }],
      contactCountry: "India",
      contactState: "Uttar Pradesh",
      contactCity: "Noida",
      sameAsOffice: false,
      logo: null,
      logoPreview: "",
      primaryFont: "",
      secondaryFont: "",
      brandImages: [],
      colorRows: [
        { id: "1", hex: "000000", font: "", name: "" },
        { id: "2", hex: "000000", font: "", name: "" },
        { id: "3", hex: "000000", font: "", name: "" },
        { id: "4", hex: "000000", font: "", name: "" },
      ],
    })
  }

  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        { id: Date.now().toString(), platform: "Twitter", url: "" }
      ]
    }))
  }

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { id: Date.now().toString(), name: "", email: "", countryCode: "+91", phone: "" }
      ]
    }))
  }

  const addColorRow = () => {
    setFormData(prev => ({
      ...prev,
      colorRows: [
        ...prev.colorRows,
        { id: Date.now().toString(), hex: "000000", font: "", name: "" }
      ]
    }))
  }

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

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }))
  }

  const updateSocialLink = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(s =>
        s.id === id ? { ...s, url: value } : s
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

  // Step 1: Brand Info
  const renderBrandInfo = () => (
    <div className="space-y-8 px-2">
      {/* Brand Information */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-5">Brand Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex items-center gap-4">
              <Label className="text-sm text-foreground/80 font-medium w-24 shrink-0">Brand<br/>Name</Label>
              <Input
                placeholder=""
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                className="h-10 flex-1"
              />
            </div>
            <div className="flex items-center gap-4">
              <Label className="text-sm text-foreground/80 font-medium w-20 shrink-0">Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-sm text-foreground/80 font-medium w-24 shrink-0">Website<br/>URL</Label>
            <Input
              placeholder=""
              value={formData.websiteUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              className="h-10 flex-1"
            />
          </div>
        </div>
      </div>

      {/* Office Location */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-5">Office Location</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Label className="text-sm text-foreground/80 font-medium w-24 shrink-0">Address</Label>
            <Input
              id="office-address-autocomplete"
              placeholder="Start typing address..."
              value={formData.officeAddress || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, officeAddress: e.target.value }))}
              className="h-10 flex-1"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm text-foreground/80 font-medium shrink-0">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm text-foreground/80 font-medium shrink-0">State</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {indianStates.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm text-foreground/80 font-medium shrink-0">City</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(cities[formData.state] || ["Select State First"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-5">Social Media Links</h3>
        <div className="space-y-4">
          {formData.socialLinks.map((link) => (
            <div key={link.id} className="flex items-center gap-4">
              <Label className="text-sm text-foreground/80 font-medium w-24 shrink-0">{link.platform}</Label>
              <Input
                placeholder=""
                value={link.url}
                onChange={(e) => updateSocialLink(link.id, e.target.value)}
                className="h-10 flex-1"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <Button
            type="button"
            onClick={addSocialLink}
            className="gap-2 bg-[#5C6ECD] text-white hover:bg-[#4A5BC7]"
          >
            <Plus className="w-4 h-4" />
            ADD FIELD
          </Button>
        </div>
      </div>
    </div>
  )

  // Step 2: Contact Details
  const renderContactDetails = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Personal Information</h3>
        {formData.contacts.map((contact, index) => (
          <div key={contact.id} className={cn("space-y-4", index > 0 && "mt-6 pt-6 border-t")}>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                placeholder="Enter contact name"
                value={contact.name}
                onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">E-mail address</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={contact.email}
                onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                  value={contact.countryCode}
                  onValueChange={(value) => updateContact(contact.id, "countryCode", value)}
                >
                  <SelectTrigger className="h-10 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(cc => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={contact.phone}
                  onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                  className="h-10 flex-1"
                />
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-end mt-4">
          <Button
            type="button"
            onClick={addContact}
            className="gap-2 bg-[#DBFE52] text-black hover:bg-[#c9eb4a]"
          >
            <Plus className="w-4 h-4" />
            ADD NEW CONTACT
          </Button>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Location</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select
              value={formData.contactCountry}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contactCountry: value }))}
              disabled={formData.sameAsOffice}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select
              value={formData.contactState}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contactState: value }))}
              disabled={formData.sameAsOffice}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {indianStates.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Select
              value={formData.contactCity}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contactCity: value }))}
              disabled={formData.sameAsOffice}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cities[formData.contactState] || ["Select State First"]).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="sameAsOffice"
            checked={formData.sameAsOffice}
            onCheckedChange={(checked) => {
              const isChecked = checked === true
              setFormData(prev => ({
                ...prev,
                sameAsOffice: isChecked,
                ...(isChecked ? {
                  contactCountry: prev.country,
                  contactState: prev.state,
                  contactCity: prev.city,
                } : {})
              }))
            }}
          />
          <Label htmlFor="sameAsOffice" className="text-sm text-muted-foreground cursor-pointer">
            Same as office address
          </Label>
        </div>
      </div>
    </div>
  )

  // Step 3: Brand Assets
  const renderBrandAssets = () => (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Brand Assets</h3>
        <div className="flex items-center gap-4">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">Logo</Label>
          <div className="flex-1 flex items-center gap-3">
            <Input
              readOnly
              placeholder="No file selected"
              value={formData.logo?.name || ""}
              className="h-10 flex-1"
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              className="gap-2 h-10"
            >
              <Upload className="w-4 h-4" />
              UPLOAD
            </Button>
          </div>
        </div>
      </div>

      {/* Brand Fonts */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Brand Fonts</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primary Font</Label>
            <Select
              value={formData.primaryFont}
              onValueChange={(value) => setFormData(prev => ({ ...prev, primaryFont: value }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select Font" />
              </SelectTrigger>
              <SelectContent>
                {fonts.filter(f => f !== "Select Font").map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secondary Font</Label>
            <Select
              value={formData.secondaryFont}
              onValueChange={(value) => setFormData(prev => ({ ...prev, secondaryFont: value }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select Font" />
              </SelectTrigger>
              <SelectContent>
                {fonts.filter(f => f !== "Select Font").map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          • You can upload your font if it is not listed on google fonts<br />
          • Supported formats .TTF & .OTF
        </p>
        <div className="flex gap-3 mt-4">
          <Button
            type="button"
            className="gap-2 bg-[#DBFE52] text-black hover:bg-[#c9eb4a]"
          >
            <Plus className="w-4 h-4" />
            ADD NEW FONT ROW
          </Button>
          <Button
            type="button"
            className="gap-2 bg-[#DBFE52] text-black hover:bg-[#c9eb4a]"
          >
            <Plus className="w-4 h-4" />
            UPLOAD YOUR FONT
          </Button>
        </div>
      </div>

      {/* Brand Colors */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Brand Colors</h3>
        <div className="flex gap-6">
          {/* Image Upload Area */}
          <div className="w-64 shrink-0">
            {formData.brandImages.length > 0 ? (
              <div className="relative">
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                  <img
                    src={formData.brandImages[currentImageIndex]}
                    alt="Brand colors"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Image Navigation */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {formData.brandImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentImageIndex
                          ? "bg-foreground"
                          : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-center mt-3">
                  <Button
                    type="button"
                    onClick={() => brandImageInputRef.current?.click()}
                    className="gap-2 bg-[#DBFE52] text-black hover:bg-[#c9eb4a]"
                  >
                    <Plus className="w-4 h-4" />
                    ADD MORE IMAGES
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => brandImageInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ImageIcon className="w-10 h-10" />
                <span className="text-sm">Browse media</span>
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
          <div className="flex-1 space-y-3">
            {formData.colorRows.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                {/* Color Picker */}
                <div className="relative flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">#</span>
                  <Input
                    value={row.hex}
                    onChange={(e) => updateColorRow(row.id, "hex", e.target.value.replace("#", ""))}
                    className="h-9 w-20 font-mono text-sm"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center"
                    style={{ backgroundColor: `#${row.hex}` }}
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "color"
                      input.value = `#${row.hex}`
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement
                        updateColorRow(row.id, "hex", target.value.replace("#", ""))
                      }
                      input.click()
                    }}
                  >
                    <Pencil className="w-3 h-3 text-white mix-blend-difference" />
                  </button>
                </div>

                {/* Font Select */}
                <Select
                  value={row.font}
                  onValueChange={(value) => updateColorRow(row.id, "font", value)}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="Select Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Font</SelectItem>
                    <SelectItem value="secondary">Secondary Font</SelectItem>
                  </SelectContent>
                </Select>

                {/* Color Name */}
                <Input
                  placeholder="Color Name"
                  value={row.name}
                  onChange={(e) => updateColorRow(row.id, "name", e.target.value)}
                  className="h-9 flex-1"
                />
              </div>
            ))}
            <div className="flex justify-end mt-4">
              <Button
                type="button"
                onClick={addColorRow}
                className="gap-2 bg-[#DBFE52] text-black hover:bg-[#c9eb4a]"
              >
                <Plus className="w-4 h-4" />
                ADD ROW
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-8 pt-6 pb-4 border-b-2 border-[#5C6ECD]">
          <DialogTitle className="text-xl font-bold">New client</DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-12 py-5">
          {steps.map((s) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                  step === s.number
                    ? "bg-[#5C6ECD] border-[#5C6ECD] text-white"
                    : step > s.number
                    ? "bg-[#5C6ECD] border-[#5C6ECD] text-white"
                    : "bg-transparent border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {s.number}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  step === s.number ? "text-[#5C6ECD]" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {step === 1 && renderBrandInfo()}
          {step === 2 && renderContactDetails()}
          {step === 3 && renderBrandAssets()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="border-muted-foreground/30"
              >
                PREVIOUS
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#1a1a2e] text-white hover:bg-[#2a2a3e] dark:bg-[#2a2a3e] dark:hover:bg-[#3a3a4e]"
            >
              CANCEL
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-[#DBFE52] text-black hover:bg-[#c9eb4a] font-semibold"
              >
                NEXT
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                className="bg-[#DBFE52] text-black hover:bg-[#c9eb4a] font-semibold"
              >
                SAVE
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
