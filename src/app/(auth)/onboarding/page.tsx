import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, full_name")
    .eq("id", user.id)
    .single()

  if (profile?.onboarded) {
    redirect("/studio")
  }

  // Detect role from organization_members (pre-linked via invitation)
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, name, custom_role_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  let detectedRole: "admin" | "designer" | "client" | null = null
  let userName = profile?.full_name || user.user_metadata?.full_name || ""

  if (membership) {
    if (membership.role === "owner") detectedRole = "admin"
    else if (membership.role === "client") detectedRole = "client"
    else detectedRole = "designer"
    if (membership.name && !userName) userName = membership.name
  }

  // Pre-invited internal member with assigned custom role.
  // Do not pick an arbitrary row: only auto-detect when exactly one pending
  // membership exists. Multiple orgs require the user to choose a path in
  // OnboardingForm (role selection) instead of inheriting the wrong org.
  if (!detectedRole && user.email) {
    const { data: pendingMembers } = await supabase
      .from("organization_members")
      .select("role, name, custom_role_id")
      .eq("email", user.email)
      .is("user_id", null)

    if (pendingMembers?.length === 1) {
      const pendingMember = pendingMembers[0]
      if (pendingMember.custom_role_id) {
        detectedRole = pendingMember.role === "client" ? "client" : "designer"
        if (pendingMember.name && !userName) userName = pendingMember.name
      }
    }
  }

  // Invitation lookup — same uniqueness rule as pending memberships.
  if (!detectedRole && user.email) {
    const { data: invitations } = await supabase
      .from("invitations")
      .select("role, name")
      .eq("email", user.email)
      .eq("status", "pending")

    if (invitations?.length === 1) {
      const invitation = invitations[0]
      detectedRole = invitation.role as "designer" | "client"
      if (invitation.name && !userName) userName = invitation.name
    }
  }

  // Check if user owns an organization
  if (!detectedRole) {
    const { data: ownedOrg } = await supabase
      .from("organizations")
      .select("name")
      .eq("created_by", user.id)
      .limit(1)
      .single()

    if (ownedOrg) {
      detectedRole = "admin"
    }
  }

  return (
    <OnboardingForm
      userEmail={user.email ?? ""}
      detectedRole={detectedRole}
      userName={userName}
    />
  )
}
