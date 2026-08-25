import { createClient } from "@/lib/supabase/server"
import {
  ApproveCreativeError,
  approveCreative,
} from "@/lib/approve-creative-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: creativeId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { projectId?: string }
    const projectId = (body.projectId || "").trim()

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 })
    }

    const result = await approveCreative(
      supabase,
      user.id,
      projectId,
      creativeId
    )

    return Response.json(result)
  } catch (error) {
    if (error instanceof ApproveCreativeError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    console.error("Approve creative failed:", error)
    return Response.json(
      { error: "Could not approve the creative. Please try again." },
      { status: 500 }
    )
  }
}
