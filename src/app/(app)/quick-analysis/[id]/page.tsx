import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuickAnalysisCanvas } from "@/components/quick-analysis/quick-analysis-canvas"
import {
  buildQuickAnalysisSuggestionList,
  type QuickAnalysisSuggestionRow,
} from "@/lib/map-quick-analysis-suggestion-rows"
import { createQuickAnalysisSignedUrl } from "@/lib/quick-analysis-storage"
import { requireQuickAnalysisPageContext } from "@/lib/quick-analysis-page-auth"
import { resolveIterationMediaType } from "@/lib/media-type"

export const dynamic = "force-dynamic"

interface QuickAnalysisDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function QuickAnalysisDetailPage({
  params,
}: QuickAnalysisDetailPageProps) {
  const ctx = await requireQuickAnalysisPageContext()
  const { id } = await params
  const supabase = await createClient()

  const { data: canAccess } = await supabase.rpc(
    "user_can_access_quick_analysis",
    { p_quick_analysis_id: id }
  )

  if (!canAccess) {
    notFound()
  }

  const { data: analysis, error } = await supabase
    .from("quick_analyses")
    .select(
      "id, file_name, storage_path, media_type, page_count, organization_id"
    )
    .eq("id", id)
    .single()

  if (error || !analysis) {
    notFound()
  }

  const { data: suggestionsRaw, error: suggestionsError } = await supabase
    .from("quick_analysis_suggestions")
    .select(
      "id, run_id, quick_analysis_id, page_number, analysis_type, label, description, bbox_x1, bbox_y1, bbox_x2, bbox_y2, severity, sort_order, ignored, created_at, quick_analysis_runs(image_width, image_height)"
    )
    .eq("quick_analysis_id", id)
    .eq("ignored", false)
    .order("sort_order", { ascending: true })

  if (suggestionsError) {
    console.error(
      "Failed to load quick analysis suggestions:",
      suggestionsError.message
    )
  }

  let fileUrl: string
  try {
    fileUrl = await createQuickAnalysisSignedUrl(supabase, analysis.storage_path)
  } catch {
    redirect("/quick-analysis")
  }

  const suggestions = buildQuickAnalysisSuggestionList(
    (suggestionsRaw || []) as QuickAnalysisSuggestionRow[]
  )

  return (
    <QuickAnalysisCanvas
      analysisId={analysis.id}
      fileName={analysis.file_name}
      mediaType={resolveIterationMediaType(
        analysis.media_type,
        analysis.storage_path
      )}
      pageCount={analysis.page_count}
      fileUrl={fileUrl}
      initialSuggestions={suggestions}
      user={ctx.user}
    />
  )
}
