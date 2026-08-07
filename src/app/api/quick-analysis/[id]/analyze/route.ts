import { createClient } from "@/lib/supabase/server"
import { parseClientAnalysisImagePayload } from "@/lib/ai-analysis-client-image"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"
import {
  runQuickAnalysis,
  toQuickAnalysisServiceError,
} from "@/lib/quick-analysis-service"
import type { RunQuickAnalysisInput } from "@/types/quick-analysis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function isPersistedAnalysisType(
  value: unknown
): value is PersistedAiAnalysisType {
  return value === "spacing" || value === "spelling" || value === "lineheight"
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quickAnalysisId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Partial<RunQuickAnalysisInput>
    try {
      body = (await request.json()) as Partial<RunQuickAnalysisInput>
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const analysisType = body.analysisType
    const pageNumber =
      typeof body.pageNumber === "number" && Number.isFinite(body.pageNumber)
        ? Math.max(1, Math.floor(body.pageNumber))
        : 1

    if (!isPersistedAnalysisType(analysisType)) {
      return Response.json(
        {
          error:
            "analysisType must be 'spacing', 'spelling', or 'lineheight'",
        },
        { status: 400 }
      )
    }

    let clientImage: RunQuickAnalysisInput["clientImage"]
    if (body.clientImage !== undefined) {
      const parsedClientImage = parseClientAnalysisImagePayload(body.clientImage)
      if (!parsedClientImage) {
        return Response.json({ error: "Invalid clientImage payload" }, { status: 400 })
      }
      clientImage = parsedClientImage
    }

    const result = await runQuickAnalysis(supabase, user.id, {
      quickAnalysisId,
      analysisType,
      pageNumber,
      clientImage,
    })

    console.log("[Quick AI Analysis] API complete", {
      quickAnalysisId,
      analysisType,
      pageNumber,
      empty: result.empty,
      suggestionCount: result.suggestions.length,
    })

    return Response.json(result)
  } catch (error) {
    const serviceError = toQuickAnalysisServiceError(error)
    console.error("[Quick AI Analysis] API error", {
      message: serviceError.message,
      status: serviceError.status,
    })
    return Response.json(
      { error: serviceError.message },
      { status: serviceError.status }
    )
  }
}
