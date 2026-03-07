import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { BriefContent } from "@/components/brief/brief-content"

interface BriefPageProps {
  params: Promise<{ briefId: string }>
}

export default async function BriefPage({ params }: BriefPageProps) {
  const supabase = await createClient()
  const { briefId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", user.id)
    .single()

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  // Fetch organization
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url")
    .eq("created_by", user.id)

  const organization = orgs?.[0] ?? null

  // Fetch client directory for header
  const { data: allClients } = organization
    ? await supabase
        .from("clients")
        .select("id,name,logo_url")
        .eq("organization_id", organization.id)
    : { data: [] }

  const clientDirectory =
    allClients?.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url || undefined })) ?? []

  // Fetch team members for header
  const { data: orgMembersRaw } = organization
    ? await supabase
        .from("organization_members")
        .select("id, name, email, avatar_url, role")
        .eq("organization_id", organization.id)
        .order("name")
    : { data: [] }

  const teamMembers =
    orgMembersRaw?.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      avatar: m.avatar_url || "",
      role: m.role || "",
    })) ?? []

  // Fetch project data
  const { data: project } = await supabase
    .from("projects")
    .select("id,name,project_type,description")
    .eq("id", briefId)
    .single()

  // Fetch creatives from the creatives table
  const { data: projectCreatives } = project
    ? await supabase
        .from("creatives")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true })
    : { data: [] }

  const projectData = project
    ? {
        id: project.id,
        name: project.name,
        type: project.project_type || "Other",
        description: project.description || "",
        creatives: (projectCreatives || []).map((c) => ({
          id: c.id,
          name: c.name,
          type: (c.type || "design") as
            | "image"
            | "video"
            | "document"
            | "design",
          thumbnailUrl: c.thumbnail_url || "",
          createdAt: c.created_at || "",
          updatedAt: c.updated_at
            ? new Date(c.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })
            : "Recently",
          feedbackCount: c.feedback_count || 0,
          unresolvedCount: c.unresolved_count || 0,
          deliverables: (
            (c.deliverables as Record<string, string>[]) || []
          ).map((d) => ({
            id: d.id || `d${Math.random().toString(36).slice(2)}`,
            name: d.name || "",
            status: (d.status || "pending") as
              | "pending"
              | "in_progress"
              | "completed",
            dueDate: d.dueDate || undefined,
          })),
        })),
      }
    : null

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={userData}
        organizationId={organization?.id ?? null}
        organizationLogoUrl={organization?.logo_url ?? null}
        clientDirectory={clientDirectory}
        teamMembers={teamMembers}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} />
        <BriefContent projectData={projectData} />
      </div>
    </div>
  )
}
