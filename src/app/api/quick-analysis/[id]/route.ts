import { createClient } from "@/lib/supabase/server"
import {
  assertCanAccessQuickAnalysis,
  QuickAnalysisAccessError,
} from "@/lib/quick-analysis-access"
import { createQuickAnalysisSignedUrl } from "@/lib/quick-analysis-storage"
import {
  buildQuickAnalysisSuggestionList,
  type QuickAnalysisSuggestionRow,
} from "@/lib/map-quick-analysis-suggestion-rows"
import { toQuickAnalysisServiceError } from "@/lib/quick-analysis-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
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

    const analysis = await assertCanAccessQuickAnalysis(supabase, id)

    const [{ data: record }, { data: suggestionsRaw, error: suggestionsError }] =
      await Promise.all([
        supabase
          .from("quick_analyses")
          .select(
            "id, organization_id, created_by, file_name, storage_path, media_type, page_count, created_at, updated_at"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("quick_analysis_suggestions")
          .select(
            "id, run_id, quick_analysis_id, page_number, analysis_type, label, description, bbox_x1, bbox_y1, bbox_x2, bbox_y2, severity, sort_order, ignored, created_at, quick_analysis_runs(image_width, image_height)"
          )
          .eq("quick_analysis_id", id)
          .eq("ignored", false)
          .order("sort_order", { ascending: true }),
      ])

    if (suggestionsError) {
      throw suggestionsError
    }

    const fileUrl = await createQuickAnalysisSignedUrl(
      supabase,
      analysis.storage_path
    )

    const suggestions = buildQuickAnalysisSuggestionList(
      (suggestionsRaw || []) as QuickAnalysisSuggestionRow[]
    )

    return Response.json({
      analysis: record,
      fileUrl,
      suggestions,
    })
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
