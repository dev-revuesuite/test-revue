import type { AIAnalysisType, AISuggestion } from "@/components/communication/comments-panel"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"

export interface QuickAnalysisRunDimensions {
  image_width: number | null
  image_height: number | null
}

export interface QuickAnalysisSuggestionRow {
  id: string
  run_id: string
  quick_analysis_id: string
  page_number: number
  analysis_type: PersistedAiAnalysisType
  label: string
  description: string
  bbox_x1: number
  bbox_y1: number
  bbox_x2: number
  bbox_y2: number
  severity: "info" | "warning" | "error"
  sort_order: number
  ignored: boolean
  created_at: string
  quick_analysis_runs:
    | QuickAnalysisRunDimensions
    | QuickAnalysisRunDimensions[]
    | null
}

function resolveRunDimensions(
  run: QuickAnalysisSuggestionRow["quick_analysis_runs"]
): { imageWidth: number; imageHeight: number } | null {
  if (!run) return null

  const row = Array.isArray(run) ? run[0] : run
  if (!row?.image_width || !row?.image_height) return null

  return {
    imageWidth: row.image_width,
    imageHeight: row.image_height,
  }
}

function centerLocationFromBbox(
  bbox: AISuggestion["bbox"],
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  if (!bbox) {
    return { x: 50, y: 50 }
  }

  return {
    x: ((bbox.x1 + bbox.x2) / 2 / imageWidth) * 100,
    y: ((bbox.y1 + bbox.y2) / 2 / imageHeight) * 100,
  }
}

export function mapQuickAnalysisSuggestionRow(
  row: QuickAnalysisSuggestionRow
): AISuggestion | null {
  const dimensions = resolveRunDimensions(row.quick_analysis_runs)
  if (!dimensions) return null

  const bbox = {
    x1: row.bbox_x1,
    y1: row.bbox_y1,
    x2: row.bbox_x2,
    y2: row.bbox_y2,
  }

  return {
    id: row.id,
    type: row.analysis_type as AIAnalysisType,
    title: row.label,
    description: row.description,
    severity: row.severity,
    pageNumber: row.page_number ?? 1,
    ignored: row.ignored,
    bbox,
    imageWidth: dimensions.imageWidth,
    imageHeight: dimensions.imageHeight,
    location: centerLocationFromBbox(
      bbox,
      dimensions.imageWidth,
      dimensions.imageHeight
    ),
  }
}

export function buildQuickAnalysisSuggestionList(
  rows: QuickAnalysisSuggestionRow[]
): AISuggestion[] {
  const suggestions = rows
    .map((row) => mapQuickAnalysisSuggestionRow(row))
    .filter((row): row is AISuggestion => row !== null && !row.ignored)

  suggestions.sort((a, b) => {
    const typeCompare = a.type.localeCompare(b.type)
    if (typeCompare !== 0) return typeCompare
    return (a.pageNumber ?? 1) - (b.pageNumber ?? 1)
  })

  return suggestions
}
