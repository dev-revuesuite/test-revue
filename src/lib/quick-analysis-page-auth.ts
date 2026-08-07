import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/get-user-role"
import {
  getUserOrganizations,
  resolveActiveOrganization,
} from "@/lib/get-active-organization"
import { redirect } from "next/navigation"

export interface QuickAnalysisPageContext {
  user: {
    name: string
    email: string
    avatar: string
  }
  userId: string
  userRole: "admin" | "designer"
  organizationId: string
  organizationName: string
  organizationLogoUrl: string | null
  organizations: {
    id: string
    name: string
    logo_url: string | null
    role: string
  }[]
}

export async function requireQuickAnalysisPageContext(): Promise<QuickAnalysisPageContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, allOrganizations] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url,onboarded,active_organization_id")
      .eq("id", user.id)
      .maybeSingle(),
    getUserOrganizations(supabase, user.id),
  ])

  if (!profile || profile.onboarded === false) {
    redirect("/onboarding")
  }

  const organization = await resolveActiveOrganization(
    supabase,
    user.id,
    allOrganizations,
    profile.active_organization_id
  )

  const { role: userRole } = await getUserRole(supabase, user.id, organization)

  if (userRole === "client") {
    redirect("/client-portal")
  }

  if (!organization) {
    redirect("/studio")
  }

  return {
    user: {
      name:
        profile.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User",
      email: user.email || "",
      avatar: profile.avatar_url || user.user_metadata?.avatar_url || "",
    },
    userId: user.id,
    userRole,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationLogoUrl: organization.logo_url,
    organizations: allOrganizations,
  }
}

export async function getQuickAnalysisTeamMembers(organizationId: string) {
  const supabase = await createClient()

  const { data: orgMembersRaw } = await supabase
    .from("organization_members")
    .select("id, name, email, avatar_url, role")
    .eq("organization_id", organizationId)
    .order("name")

  return (
    orgMembersRaw?.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      avatar: m.avatar_url || "",
      role: m.role || "",
    })) ?? []
  )
}

export async function getQuickAnalysisClientDirectory(organizationId: string) {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, logo_url")
    .eq("organization_id", organizationId)
    .order("name")

  return (
    clients?.map((client) => ({
      id: client.id,
      name: client.name,
      logoUrl: client.logo_url || undefined,
    })) ?? []
  )
}
