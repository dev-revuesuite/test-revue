import { createClient } from "@/lib/supabase/server"
import {
  assertCanManageQuickAnalysisSuggestion,
  QuickAnalysisAccessError,
} from "@/lib/quick-analysis-access"
import {
  ignoreQuickAnalysisSuggestion,
  toQuickAnalysisServiceError,
} from "@/lib/quick-analysis-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await assertCanManageQuickAnalysisSuggestion(supabase, id)

    const body = (await request.json()) as { ignored?: boolean }
    if (body.ignored !== true) {
      return Response.json(
        { error: "Only { ignored: true } is supported" },
        { status: 400 }
      )
    }

    await ignoreQuickAnalysisSuggestion(supabase, id)

    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof QuickAnalysisAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    const serviceError = toQuickAnalysisServiceError(error)
    return Response.json(
      { error: serviceError.message },
      { status: serviceError.status }
    )
  }
}
