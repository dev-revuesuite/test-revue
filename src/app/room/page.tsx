import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { RoomContent } from "@/components/room/room-content"

interface RoomPageProps {
  searchParams: Promise<{ client?: string }>
}

export default async function RoomPage({ searchParams }: RoomPageProps) {
  const supabase = await createClient()
  const { client: clientId } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!clientId) {
    redirect("/studio")
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

  // Fetch client data
  const { data: client } = await supabase
    .from("clients")
    .select("id,name,industry,logo_url,fonts,colors,contacts,social_links,brand_image_urls,website_url,office_address,contact_address")
    .eq("id", clientId)
    .single()

  if (!client) {
    redirect("/studio")
  }

  // Fetch projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id,name,project_type,description,start_date,end_date,created_at,brief_status,workmode,references_data,external_links,budget,project_deliverables"
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  // Fetch creatives from the creatives table
  const projectIds = (projects || []).map((p) => p.id)
  const { data: allCreatives } = projectIds.length > 0
    ? await supabase
        .from("creatives")
        .select("*")
        .in("project_id", projectIds)
    : { data: [] }

  type CreativeRow = NonNullable<typeof allCreatives>[number]
  const creativesByProject = (allCreatives || []).reduce<Record<string, CreativeRow[]>>((acc, c) => {
    if (!acc[c.project_id]) acc[c.project_id] = []
    acc[c.project_id].push(c)
    return acc
  }, {})

  // Fetch project members from junction table
  const { data: projectMembersData } = projectIds.length > 0
    ? await supabase
        .from("project_members")
        .select("project_id, member_id, role, organization_members(name, avatar_url)")
        .in("project_id", projectIds)
    : { data: [] }

  const projectTeamMap: Record<string, { id: string; name: string; role: string; avatar?: string }[]> = {}
  for (const pm of projectMembersData || []) {
    if (!projectTeamMap[pm.project_id]) projectTeamMap[pm.project_id] = []
    const member = pm.organization_members as unknown as { name: string; avatar_url: string | null }
    if (member) {
      projectTeamMap[pm.project_id].push({
        id: pm.member_id,
        name: member.name || "",
        role: pm.role || "member",
        avatar: member.avatar_url || undefined,
      })
    }
  }

  const fontsRaw = (client.fonts as { label: string; font_name: string; font_url: string | null }[]) || []
  const colorsRaw = (client.colors as { hex: string; font_label: string | null; name: string | null }[]) || []
  const today = new Date()

  const clientData = {
    id: client.id,
    name: client.name,
    subtitle: client.industry || "Design Studio",
    logo: client.name.substring(0, 2).toUpperCase(),
    logoUrl: client.logo_url || undefined,
    primaryFont: fontsRaw[0]?.font_name || "Inter",
    secondaryFont: fontsRaw[1]?.font_name || "Inter",
    tertiaryFont: fontsRaw[2]?.font_name || "Inter",
    colors: colorsRaw.map((c) => c.hex),
    projects: (projects || []).map((p) => {
      const endDate = p.end_date ? new Date(p.end_date + "T00:00:00") : null
      const daysLeft = endDate
        ? Math.max(
            0,
            Math.ceil(
              (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : 0
      const createdDate = p.created_at ? new Date(p.created_at) : new Date()

      return {
        id: p.id,
        name: p.name,
        type: p.project_type || "Other",
        description: p.description || "",
        clientName: client.name,
        createdOn: createdDate.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        deadline: endDate
          ? endDate.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "No deadline",
        daysLeft,
        status: (p.brief_status || "brief_received") as
          | "brief_received"
          | "qc_pending"
          | "review_qc"
          | "iteration_shared"
          | "feedback_received"
          | "iteration_approved"
          | "completed",
        workmode: (p.workmode || "productive") as "productive" | "creative",
        team: (projectTeamMap[p.id] || []).map((t) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          avatar: t.avatar,
        })),
        additionalMembers: 0,
        references: ((p.references_data as Record<string, string>[]) || []).map(
          (r, i) => ({
            id: `r${i}`,
            name: r.name || "",
            url: r.file_url || undefined,
            size: undefined as string | undefined,
          })
        ),
        externalLinks: (
          (p.external_links as Record<string, string>[]) || []
        ).map((l, i) => ({
          id: `el${i}`,
          name: l.name || "",
          url: l.name || undefined,
        })),
        budget: p.budget || undefined,
        deliverables: (
          (p.project_deliverables as Record<string, string>[]) || []
        ).map((d) => ({
          id: d.id || `d${Math.random().toString(36).slice(2)}`,
          name: d.name || "",
          status: (d.status || "pending") as
            | "pending"
            | "in_progress"
            | "completed",
          dueDate: d.dueDate || undefined,
        })),
        creatives: (creativesByProject[p.id] || []).map((c) => ({
          id: c.id,
          name: c.name,
          type: (c.type || "design") as
            | "image"
            | "video"
            | "document"
            | "design",
          thumbnailUrl: c.thumbnail_url || "",
          updatedAt: c.updated_at
            ? new Date(c.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })
            : "Recently",
          feedbackCount: c.feedback_count || 0,
          iteration: c.iteration || 1,
          status: (c.status || "in_progress") as
            | "in_progress"
            | "completed",
        })),
      }
    }),
  }

  // Build edit data for the client onboarding form
  const contactsRaw = (client.contacts as { name: string; email: string; country_code: string; phone: string; whatsapp?: boolean }[]) || []
  const socialLinksRaw = (client.social_links as { platform: string; url: string }[]) || []
  const brandImageUrlsRaw = (client.brand_image_urls as string[]) || []

  const clientEditData = {
    brandName: client.name || "",
    industry: client.industry || "",
    websiteUrl: client.website_url || "",
    officeAddress: client.office_address || "",
    contactAddress: client.contact_address || "",
    sameAsOffice: (client.contact_address || "") === (client.office_address || ""),
    logoPreview: client.logo_url || "",
    contacts: contactsRaw.length > 0
      ? contactsRaw.map((c, i) => ({
          id: String(i + 1),
          name: c.name || "",
          email: c.email || "",
          countryCode: c.country_code || "+91",
          phone: c.phone || "",
          whatsapp: c.whatsapp ?? false,
        }))
      : [{ id: "1", name: "", email: "", countryCode: "+91", phone: "", whatsapp: false }],
    socialLinks: socialLinksRaw.length > 0
      ? socialLinksRaw.map((s, i) => ({
          id: String(i + 1),
          platform: s.platform || "Instagram",
          url: s.url || "",
        }))
      : [
          { id: "1", platform: "Instagram", url: "" },
          { id: "2", platform: "Facebook", url: "" },
          { id: "3", platform: "LinkedIn", url: "" },
        ],
    fontRows: fontsRaw.length > 0
      ? fontsRaw.map((f, i) => ({
          id: String(i + 1),
          label: f.label || (i === 0 ? "Primary" : "Secondary"),
          font: f.font_name || "",
        }))
      : [
          { id: "1", label: "Primary", font: "" },
          { id: "2", label: "Secondary", font: "" },
        ],
    colorRows: colorsRaw.length > 0
      ? colorsRaw.map((c, i) => ({
          id: String(i + 1),
          hex: c.hex || "",
          font: c.font_label || "",
          name: c.name || "",
        }))
      : [
          { id: "1", hex: "", font: "", name: "" },
          { id: "2", hex: "", font: "", name: "" },
          { id: "3", hex: "", font: "", name: "" },
          { id: "4", hex: "", font: "", name: "" },
        ],
    brandImages: brandImageUrlsRaw,
    logo: null as File | null,
    customFonts: [] as { name: string; file: File }[],
  }

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
        <RoomContent clientData={clientData} orgMembers={teamMembers} clientEditData={clientEditData} organizationId={organization?.id ?? null} />
      </div>
    </div>
  )
}
