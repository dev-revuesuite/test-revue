import { createClient } from "@/lib/supabase/server"
import { tryAutoCompleteProject } from "@/lib/complete-project-service"

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

    const result = await tryAutoCompleteProject(supabase, projectId)

    return Response.json(result)
  } catch (error) {
    console.error("Try auto-complete project failed:", error)
    return Response.json(
      { error: "Could not update project completion status." },
      { status: 500 }
    )
  }
}
