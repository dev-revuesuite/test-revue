"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function OnboardingForm({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    // Check if user is already linked to an org as a member
    const { data: existingMembership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single()

    if (existingMembership) {
      // Update the member record with latest name/avatar
      await supabase
        .from("organization_members")
        .update({ name: fullName || userEmail.split("@")[0] })
        .eq("user_id", userId)
        .eq("organization_id", existingMembership.organization_id)

      // Route based on role
      if (existingMembership.role === "client") {
        router.push("/productive-zone")
      } else {
        router.push("/studio")
      }
      router.refresh()
      return
    }

    // No existing membership — create org as owner
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
          name: organizationName || `${fullName || "My"} Studio`,
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

    router.push("/studio")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <div className="w-40 h-14 bg-muted rounded-md" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Welcome to Revue</h1>
        <p className="text-muted-foreground text-base">
          Tell us a bit about you to set up your workspace.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Label htmlFor="fullName" className="w-28 shrink-0 text-base">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="email" className="w-28 shrink-0 text-base">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={userEmail}
            className="h-12 text-base"
            disabled
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="org" className="w-28 shrink-0 text-base">
            Studio name
          </Label>
          <Input
            id="org"
            type="text"
            placeholder="Design Studio"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="jobTitle" className="w-28 shrink-0 text-base">
            Job title
          </Label>
          <Input
            id="jobTitle"
            type="text"
            placeholder="Creative Director"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="phone" className="w-28 shrink-0 text-base">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label className="w-28 shrink-0 text-base">Theme</Label>
          <div className="flex gap-2">
            {["light", "dark"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option as "light" | "dark")}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  theme === option
                    ? "border-[#5C6ECD] bg-[#5C6ECD]/10 text-[#5C6ECD]"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {option === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          {loading ? "Saving..." : "Continue to dashboard"}
        </Button>
      </form>
    </div>
  )
}
