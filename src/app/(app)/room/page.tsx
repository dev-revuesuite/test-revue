import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoomPageShell } from "@/components/room/room-page-shell"
import { getUserRole } from "@/lib/get-user-role"
import { getActiveOrganization, getUserOrganizations } from "@/lib/get-active-organization"
import { resolveIterationMediaType } from "@/lib/media-type"
import { normalizeExternalUrl } from "@/lib/external-link"
import { normalizeCreativePipelineStatus, normalizeProjectBriefStatus } from "@/lib/creative-pipeline-status"
import type { BrandColor } from "@/components/shared/brand-color-swatch"
import { brandImageUrlsToEntries } from "@/lib/upload-client-brand-images"

export const dynamic = "force-dynamic"

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

  // Parallelize independent queries: profile, user role, active org, user orgs
  const [profileResult, userRoleResult, organization, allOrganizations] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url")
      .eq("id", user.id)
      .single(),
    getUserRole(supabase, user.id),
    getActiveOrganization(supabase, user.id),
    getUserOrganizations(supabase, user.id),
  ])

  const { role: userRole, clientId: userClientId } = userRoleResult
  const { data: profile } = profileResult

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  // Fetch client directory, team members, client data, and (if client) orgMember in parallel
  const [allClientsResult, orgMembersResult, clientResult, orgMemberResult] = await Promise.all([
    organization
      ? supabase
          .from("clients")
          .select("id,name,logo_url")
          .eq("organization_id", organization.id)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; logo_url: string | null }> | null }),
    organization
      ? supabase
          .from("organization_members")
          .select("id, name, email, avatar_url, role")
          .eq("organization_id", organization.id)
          .order("name")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; email: string | null; avatar_url: string | null; role: string | null }> | null }),
    supabase
      .from("clients")
      .select("id,name,industry,logo_url,fonts,colors,contacts,social_links,brand_image_urls,website_url,office_address,contact_address,organization_id")
      .eq("id", clientId)
      .single(),
    organization
      ? supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("user_id", user.id)
          .eq("role", "client")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const allClients = allClientsResult.data
  const orgMembersRaw = orgMembersResult.data
  const { data: client } = clientResult
  const { data: orgMember } = orgMemberResult

  if (!client) {
    redirect("/studio")
  }

  // Validate client belongs to current organization
  if (organization && client.organization_id !== organization.id) {
    console.error("Client does not belong to current organization")
    redirect("/studio")
  }

  const clientDirectory =
    allClients?.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url || undefined })) ?? []

  const teamMembers =
    orgMembersRaw?.map((m) => ({
      id: m.id,
      name: m.name || "",
      email: m.email || "",
      avatar: m.avatar_url || "",
      role: m.role || "",
    })) ?? []

  type ProjectData = {
    id: string
    name: string
    project_type: string | null
    description: string | null
    start_date: string | null
    end_date: string | null
    created_at: string | null
    brief_status: string | null
    workmode: string | null
    references_data: unknown
    external_links: unknown
    budget: number | null
    project_deliverables: unknown
    brand_colors: unknown
  }

  const projectsSelect =
    "id,name,project_type,description,start_date,end_date,created_at,brief_status,workmode,references_data,external_links,budget,project_deliverables,brand_colors"

  let projects: ProjectData[] | null = null

  if (userRole === "client" && orgMember) {
    // For client users, check project_client_users table for access
    const { data: accessibleProjectIds } = await supabase
      .from("project_client_users")
      .select("project_id")
      .eq("client_user_id", orgMember.id)

    const accessibleIds = (accessibleProjectIds || []).map(p => p.project_id)

    const { data: allProjectsData } = await supabase
      .from("projects")
      .select(projectsSelect)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (!allProjectsData || allProjectsData.length === 0) {
      projects = []
    } else {
      const projectIds = allProjectsData.map(p => p.id)
      const { data: allProjectAccess } = await supabase
        .from("project_client_users")
        .select("project_id")
        .in("project_id", projectIds)

      const projectsWithAccess = new Set((allProjectAccess || []).map(p => p.project_id))

      projects = allProjectsData.filter(project => {
        const hasAccessControl = projectsWithAccess.has(project.id)
        const userHasAccess = accessibleIds.includes(project.id)
        return hasAccessControl ? userHasAccess : true
      })
    }
  } else {
    // For non-client users (admin, manager, etc.), show all projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select(projectsSelect)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    projects = projectsData
  }

  // Fetch creatives, iterations, and project members in parallel
  const projectIds = projects ? projects.map((p) => p.id) : []
  const [allCreativesResult, projectMembersDataResult] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from("creatives")
          .select("*")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> | null }),
    projectIds.length > 0
      ? supabase
          .from("project_members")
          .select("project_id, member_id, role, organization_members(name, avatar_url)")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> | null }),
  ])

  const allCreatives = allCreativesResult.data
  const projectMembersData = projectMembersDataResult.data

  type CreativeRow = NonNullable<typeof allCreatives>[number]
  const creativesByProject = (allCreatives || []).reduce<Record<string, CreativeRow[]>>((acc, c) => {
    if (!acc[c.project_id]) acc[c.project_id] = []
    acc[c.project_id].push(c)
    return acc
  }, {})

  const creativeIds = (allCreatives || []).map((c) => c.id)
  const { data: iterationsMeta } = creativeIds.length > 0
    ? await supabase
        .from("iterations")
        .select("creative_id, media_type, page_count, version")
        .in("creative_id", creativeIds)
        .order("version", { ascending: false })
    : { data: [] }

  const iterationMetaByCreative: Record<
    string,
    { mediaType: string | null; pageCount: number | null }
  > = {}
  for (const row of iterationsMeta || []) {
    if (!iterationMetaByCreative[row.creative_id]) {
      iterationMetaByCreative[row.creative_id] = {
        mediaType: row.media_type ?? null,
        pageCount: row.page_count ?? null,
      }
    }
  }

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
    colorDetails: colorsRaw.map((c) => ({ hex: c.hex, name: c.name || "" })),
    fonts: fontsRaw.map((f) => ({ label: f.label, fontName: f.font_name, fontUrl: f.font_url })),
    brandImages: ((client.brand_image_urls as string[]) || []),
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
        status: (p.brief_status === "completed"
          ? "completed"
          : normalizeProjectBriefStatus(
              p.brief_status,
              (creativesByProject[p.id] ?? []).map((creative) => creative.status as string)
            )) as
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
          // Older rows stored only `name`, so fall back to it — but normalize,
          // otherwise a bare hostname becomes a relative link to this app.
          url: normalizeExternalUrl(l.url ?? l.name) ?? undefined,
        })),
        budget: p.budget ? String(p.budget) : undefined,
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
        brandColors: ((p.brand_colors as BrandColor[]) || []).map((c) => ({
          hex: c?.hex || "#000000",
          label: c?.label || "",
        })),
        creatives: (creativesByProject[p.id] || []).map((c) => {
          const thumb = c.thumbnail_url || ""
          const meta = iterationMetaByCreative[c.id]
          const mediaType = resolveIterationMediaType(
            meta?.mediaType ?? (c.type === "document" ? "pdf" : "image"),
            thumb
          )

          return {
            id: c.id,
            name: c.name,
            type: (c.type || "design") as
              | "image"
              | "video"
              | "document"
              | "design",
            thumbnailUrl: thumb,
            previewUrl: c.preview_url || undefined,
            mediaType,
            pageCount: meta?.pageCount ?? null,
            updatedAt: c.updated_at
              ? new Date(c.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })
              : "Recently",
            feedbackCount: c.feedback_count || 0,
            iteration: c.iteration || 1,
            status: normalizeCreativePipelineStatus(c.status),
          }
        }),
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
    brandImages: brandImageUrlsToEntries(brandImageUrlsRaw),
    logo: null as File | null,
    customFonts: [] as { name: string; file: File }[],
  }

  return (
    <RoomPageShell
      user={userData}
      userId={user.id}
      organizationId={organization?.id ?? null}
      organizationName={organization?.name ?? ""}
      organizationLogoUrl={organization?.logo_url ?? null}
      currentOrgId={organization?.id}
      organizations={allOrganizations}
      clientDirectory={clientDirectory}
      teamMembers={teamMembers}
      userRole={userRole}
      userClientId={userClientId}
      clientData={clientData}
      clientEditData={clientEditData}
    />
  )
}
