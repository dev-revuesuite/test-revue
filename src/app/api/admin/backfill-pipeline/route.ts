import { createClient } from "@/lib/supabase/server"
import { backfillCreativePipelineForOrganization } from "@/lib/backfill-creative-pipeline"
import { getUserRole } from "@/lib/get-user-role"

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

    const { role, organizationId } = await getUserRole(supabase, user.id)

    if (role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!organizationId) {
      return Response.json({ error: "No active organization" }, { status: 403 })
    }

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
