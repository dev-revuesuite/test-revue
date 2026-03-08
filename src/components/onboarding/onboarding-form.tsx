"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Building2,
  Palette,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react"

type UserRole = "admin" | "designer" | "client" | null

interface OnboardingFormProps {
  userEmail: string
  detectedRole: UserRole
  userName?: string
  organizationName?: string
}

// Step indicator dots
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-500",
            i === current
              ? "w-8 bg-[#DBFE52]"
              : i < current
              ? "w-2 bg-[#DBFE52]/50"
              : "w-2 bg-zinc-700"
          )}
        />
      ))}
    </div>
  )
}

export function OnboardingForm({
  userEmail,
  detectedRole,
  userName = "",
  organizationName = "",
}: OnboardingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<UserRole>(detectedRole)
  const [fullName, setFullName] = useState(userName)
  const [orgName, setOrgName] = useState(organizationName)
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animateIn, setAnimateIn] = useState(true)

  // Determine total steps based on role
  const getTotalSteps = () => {
    if (role === "admin") return 3 // Role select -> Profile -> Org setup
    if (role === "designer") return 2 // Profile -> Theme
    if (role === "client") return 2 // Profile -> Theme
    return 3 // Default for unknown: Role select -> Profile -> Setup
  }

  // Animate step transitions
  const goToStep = (next: number) => {
    setAnimateIn(false)
    setTimeout(() => {
      setStep(next)
      setAnimateIn(true)
    }, 200)
  }

  // If role is pre-detected (invited user), skip role selection
  useEffect(() => {
    if (detectedRole) {
      setRole(detectedRole)
      setStep(1)
    }
  }, [detectedRole])

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setError(userError?.message || "Unable to load user")
      setLoading(false)
      return
    }

    const userId = userData.user.id

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || undefined,
        job_title: jobTitle || undefined,
        phone: phone || undefined,
        preferences: { theme },
        onboarded: true,
      })
      .eq("id", userId)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Auto-link to organization if email was pre-added as a team member
    await supabase.rpc("link_user_to_org_member", {
      p_user_id: userId,
      p_email: userEmail,
    })

    // Also try linking as client user
    try {
      await supabase.rpc("link_user_to_client", {
        p_user_id: userId,
        p_email: userEmail,
      })
    } catch {
      // RPC may not exist yet, ignore
    }

    // Check if user is already linked to an org as a member
    const { data: existingMembership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single()

    if (existingMembership) {
      // Update the member record with latest name
      await supabase
        .from("organization_members")
        .update({ name: fullName || userEmail.split("@")[0] })
        .eq("user_id", userId)
        .eq("organization_id", existingMembership.organization_id)

      // Route based on role
      if (existingMembership.role === "client") {
        router.push("/client-portal")
      } else {
        router.push("/studio")
      }
      router.refresh()
      return
    }

    // No existing membership — admin creates org
    if (role === "admin") {
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("created_by", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

      let orgId = existingOrg?.id
      if (!orgId) {
        const { data: createdOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName || `${fullName || "My"} Studio`,
            created_by: userId,
          })
          .select("id")
          .single()

        if (orgError) {
          setError(orgError.message)
          setLoading(false)
          return
        }
        orgId = createdOrg?.id
      }

      if (orgId) {
        await supabase.from("organization_members").upsert(
          {
            organization_id: orgId,
            user_id: userId,
            role: "owner",
            name: fullName || userEmail.split("@")[0],
            email: userEmail,
          },
          { onConflict: "organization_id,user_id" }
        )
      }
    }

    if (role === "client") {
      router.push("/client-portal")
    } else {
      router.push("/studio")
    }
    router.refresh()
  }

  // --- STEP RENDERERS ---

  // Step 0: Role Selection (only for non-invited users)
  const renderRoleSelection = () => (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">How will you use Revue?</h1>
        <p className="text-zinc-400 text-base">
          This helps us personalize your experience
        </p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        {[
          {
            value: "admin" as UserRole,
            icon: Building2,
            title: "Studio Owner",
            desc: "I run a design studio and manage clients",
          },
          {
            value: "designer" as UserRole,
            icon: Palette,
            title: "Designer",
            desc: "I'm a designer working with a team",
          },
          {
            value: "client" as UserRole,
            icon: User,
            title: "Client",
            desc: "I'm reviewing designs from a studio",
          },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setRole(opt.value)
              goToStep(1)
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left group",
              "border-zinc-800 hover:border-[#DBFE52]/50 hover:bg-zinc-800/50"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-[#DBFE52]/10 flex items-center justify-center transition-colors">
              <opt.icon className="w-6 h-6 text-zinc-400 group-hover:text-[#DBFE52] transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{opt.title}</p>
              <p className="text-sm text-zinc-500">{opt.desc}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-[#DBFE52] transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )

  // Step 1: Profile Setup
  const renderProfileSetup = () => (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#DBFE52]/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#DBFE52]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {role === "admin"
            ? "Set up your profile"
            : role === "client"
            ? "Welcome aboard"
            : "Complete your profile"}
        </h1>
        <p className="text-zinc-400 text-base">
          {role === "client"
            ? "A few details and you're ready to review"
            : "Tell us about yourself"}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 text-sm p-4 rounded-xl w-full">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 w-full">
        <div>
          <Label htmlFor="fullName" className="text-sm text-zinc-400 mb-1.5 block">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 text-base bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#DBFE52] focus:ring-[#DBFE52]/20"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm text-zinc-400 mb-1.5 block">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={userEmail}
            className="h-12 text-base bg-zinc-900/50 border-zinc-800 text-zinc-500"
            disabled
          />
        </div>

        {role !== "client" && (
          <div>
            <Label htmlFor="jobTitle" className="text-sm text-zinc-400 mb-1.5 block">
              Job title
            </Label>
            <Input
              id="jobTitle"
              type="text"
              placeholder={role === "admin" ? "Creative Director" : "Senior Designer"}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="h-12 text-base bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#DBFE52] focus:ring-[#DBFE52]/20"
            />
          </div>
        )}

        <div>
          <Label htmlFor="phone" className="text-sm text-zinc-400 mb-1.5 block">
            Phone <span className="text-zinc-600">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 text-base bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#DBFE52] focus:ring-[#DBFE52]/20"
          />
        </div>
      </div>

      <div className="flex gap-3 w-full">
        {!detectedRole && (
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(0)}
            className="h-12 px-4 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          onClick={() => {
            if (!fullName.trim()) {
              setError("Please enter your name")
              return
            }
            setError(null)
            goToStep(step + 1)
          }}
          disabled={!fullName.trim()}
          className="flex-1 h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-semibold"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  // Step 2 (Admin): Organization Setup
  const renderOrgSetup = () => (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#DBFE52]/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-[#DBFE52]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Name your studio</h1>
        <p className="text-zinc-400 text-base">
          This is how your clients will see you
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div>
          <Label htmlFor="orgName" className="text-sm text-zinc-400 mb-1.5 block">
            Studio / Organization name
          </Label>
          <Input
            id="orgName"
            type="text"
            placeholder="Acme Design Studio"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="h-12 text-base bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#DBFE52] focus:ring-[#DBFE52]/20"
          />
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToStep(step - 1)}
          className="h-12 px-4 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Launch Studio
              <Sparkles className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  // Step 2 (Designer/Client): Theme + Finish
  const renderThemeAndFinish = () => (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#DBFE52]/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-[#DBFE52]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Almost there!</h1>
        <p className="text-zinc-400 text-base">Choose your preferred theme</p>
      </div>

      <div className="flex gap-4 w-full">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
            theme === "light"
              ? "border-[#DBFE52] bg-[#DBFE52]/5"
              : "border-zinc-800 hover:border-zinc-700"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              theme === "light" ? "bg-[#DBFE52]/20" : "bg-zinc-800"
            )}
          >
            <Sun
              className={cn(
                "w-6 h-6",
                theme === "light" ? "text-[#DBFE52]" : "text-zinc-500"
              )}
            />
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              theme === "light" ? "text-white" : "text-zinc-500"
            )}
          >
            Light
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
            theme === "dark"
              ? "border-[#DBFE52] bg-[#DBFE52]/5"
              : "border-zinc-800 hover:border-zinc-700"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              theme === "dark" ? "bg-[#DBFE52]/20" : "bg-zinc-800"
            )}
          >
            <Moon
              className={cn(
                "w-6 h-6",
                theme === "dark" ? "text-[#DBFE52]" : "text-zinc-500"
              )}
            />
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              theme === "dark" ? "text-white" : "text-zinc-500"
            )}
          >
            Dark
          </span>
        </button>
      </div>

      <div className="flex gap-3 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToStep(step - 1)}
          className="h-12 px-4 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              {role === "client" ? "Start Reviewing" : "Enter Studio"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  // Render current step
  const renderStep = () => {
    if (step === 0 && !detectedRole) return renderRoleSelection()

    if (role === "admin") {
      if (step === 1) return renderProfileSetup()
      if (step === 2) return renderOrgSetup()
    }

    if (role === "designer" || role === "client") {
      if (step === 1) return renderProfileSetup()
      if (step === 2) return renderThemeAndFinish()
    }

    // Fallback
    if (step === 1) return renderProfileSetup()
    if (step === 2) return renderThemeAndFinish()

    return renderRoleSelection()
  }

  return (
    <div className="flex flex-col items-center min-h-svh bg-zinc-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#DBFE52]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DBFE52]/3 rounded-full blur-3xl" />
      </div>

      {/* Top bar with logo + step indicator */}
      <div className="w-full flex items-center justify-between px-8 pt-8 relative z-10">
        <Image
          src="/Logo/Artboard 8 copy@2x.png"
          alt="Revue"
          width={120}
          height={37}
          priority
        />
        {step > 0 && <StepDots total={getTotalSteps()} current={step - (detectedRole ? 1 : 0)} />}
      </div>

      {/* Content area */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center px-6 py-12 relative z-10 w-full transition-all duration-300",
          animateIn
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        )}
      >
        {renderStep()}
      </div>
    </div>
  )
}
