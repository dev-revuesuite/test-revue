import { createClient } from "@/lib/supabase/server"
import { backfillCreativePipelineForOrganization } from "@/lib/backfill-creative-pipeline"
import { getUserPermissions } from "@/lib/get-user-permissions"
import { getActiveOrganization } from "@/lib/get-active-organization"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organization = await getActiveOrganization(supabase, user.id)
    if (!organization) {
      return Response.json({ error: "No active organization" }, { status: 403 })
    }

    const permissionsResult = await getUserPermissions(
      supabase,
      user.id,
      organization.id
    )
    if (!permissionsResult.isOrgOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const organizationId = organization.id

    const result = await backfillCreativePipelineForOrganization(
      supabase,
      organizationId
    )

    return Response.json(result)
  } catch (error) {
    console.error("Pipeline backfill failed:", error)
    return Response.json(
      { error: "Could not backfill pipeline statuses." },
      { status: 500 }
    )
  }
}
