import { createClient } from "@/lib/supabase/server"
import {
  runAiAnalysis,
  toServiceError,
  type RunAiAnalysisInput,
} from "@/lib/ai-analysis-service"
import { parseClientAnalysisImagePayload } from "@/lib/ai-analysis-client-image"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function isPersistedAnalysisType(value: unknown): value is PersistedAiAnalysisType {
  return value === "spacing" || value === "spelling" || value === "lineheight"
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Partial<RunAiAnalysisInput>
    try {
      body = (await request.json()) as Partial<RunAiAnalysisInput>
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const iterationId = body.iterationId?.trim()
    const analysisType = body.analysisType
    const pageNumber =
      typeof body.pageNumber === "number" && Number.isFinite(body.pageNumber)
        ? Math.max(1, Math.floor(body.pageNumber))
        : 1

    if (!iterationId) {
      return Response.json({ error: "iterationId is required" }, { status: 400 })
    }

    if (!isPersistedAnalysisType(analysisType)) {
      return Response.json(
        { error: "analysisType must be 'spacing', 'spelling', or 'lineheight'" },
        { status: 400 }
      )
    }

    let clientImage: RunAiAnalysisInput["clientImage"]
    if (body.clientImage !== undefined) {
      const parsedClientImage = parseClientAnalysisImagePayload(body.clientImage)
      if (!parsedClientImage) {
        return Response.json({ error: "Invalid clientImage payload" }, { status: 400 })
      }
      clientImage = parsedClientImage
    }

    const result = await runAiAnalysis(supabase, user.id, {
      iterationId,
      analysisType,
      pageNumber,
      clientImage,
    })

    console.log("[AI Analysis] API complete", {
      iterationId,
      analysisType,
      pageNumber,
      empty: result.empty,
      suggestionCount: result.suggestions.length,
    })

    return Response.json(result)
  } catch (error) {
    const serviceError = toServiceError(error)
    console.error("[AI Analysis] API error", {
      message: serviceError.message,
      status: serviceError.status,
    })
    return Response.json(
      { error: serviceError.message },
      { status: serviceError.status }
    )
  }
}
