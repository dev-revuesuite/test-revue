import type { AIAnalysisType, AISuggestion } from "@/components/communication/comments-panel"

export type PersistedAiAnalysisType = "spacing" | "spelling" | "lineheight"

export interface AiAnalysisRunDimensions {
  image_width: number | null
  image_height: number | null
}

export interface AiSuggestionRow {
  id: string
  run_id: string
  iteration_id: string
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
  ai_analysis_runs: AiAnalysisRunDimensions | AiAnalysisRunDimensions[] | null
}

function resolveRunDimensions(
  run: AiSuggestionRow["ai_analysis_runs"]
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

export function mapAiSuggestionRow(row: AiSuggestionRow): AISuggestion | null {
  const dimensions = resolveRunDimensions(row.ai_analysis_runs)
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

export function buildAiSuggestionMap(
  rows: AiSuggestionRow[]
): Record<string, AISuggestion[]> {
  const map: Record<string, AISuggestion[]> = {}

  for (const row of rows) {
    const suggestion = mapAiSuggestionRow(row)
    if (!suggestion || suggestion.ignored) continue

    if (!map[row.iteration_id]) map[row.iteration_id] = []
    map[row.iteration_id].push(suggestion)
  }

  for (const iterationId of Object.keys(map)) {
    map[iterationId].sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type)
      if (typeCompare !== 0) return typeCompare
      return (a.pageNumber ?? 1) - (b.pageNumber ?? 1)
    })
  }

  return map
}
