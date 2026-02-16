import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { StudioContent } from "@/components/studio/studio-content"

export default async function StudioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url,preferences,onboarded")
    .eq("id", user.id)
    .single()

  if (!profile || profile.onboarded === false) {
    redirect("/onboarding")
  }

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url,clients(count)")
    .eq("created_by", user.id)

  let organization =
    orgs?.reduce((best, current) => {
      const currentCount = current.clients?.[0]?.count ?? 0
      const bestCount = best?.clients?.[0]?.count ?? -1
      return currentCount > bestCount ? current : best
    }, null as typeof orgs extends (infer T)[] ? T | null : null) ?? null

  if (!organization) {
    const { data: createdOrg } = await supabase
      .from("organizations")
      .insert({ name: `${userData.name} Studio`, created_by: user.id })
      .select("id,name,logo_url")
      .single()

    if (createdOrg) {
      organization = { ...createdOrg, clients: [{ count: 0 }] }
      await supabase.from("organization_members").insert({
        organization_id: createdOrg.id,
        user_id: user.id,
        role: "owner",
      })
    }
  }

  const { data: clients } = organization
    ? await supabase
        .from("clients")
        .select("id,name,created_at,interaction_date,feedback_date,projects(count)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
    : { data: [] }

  const clientsData =
    clients?.map((client) => ({
      id: client.id,
      name: client.name,
      createdAt: client.created_at,
      interactionDate: client.interaction_date,
      feedbackDate: client.feedback_date,
      activeProjects: client.projects?.[0]?.count ?? 0,
      team: [],
      additionalMembers: 0,
    })) ?? []

  const clientDirectory =
    clients?.map((client) => ({
      id: client.id,
      name: client.name,
    })) ?? []

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={userData}
        organizationId={organization?.id ?? null}
        organizationLogoUrl={organization?.logo_url ?? null}
        clientDirectory={clientDirectory}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} />
        <StudioContent user={userData} clients={clientsData} />
      </div>
    </div>
  )
}
