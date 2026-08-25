import { createClient } from "@/lib/supabase/server"
import {
  completeProject,
  CompleteProjectError,
} from "@/lib/complete-project-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await completeProject(supabase, user.id, projectId)

    return Response.json(result)
  } catch (error) {
    if (error instanceof CompleteProjectError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    console.error("Complete project failed:", error)
    return Response.json(
      { error: "Could not complete the project. Please try again." },
      { status: 500 }
    )
  }
}
