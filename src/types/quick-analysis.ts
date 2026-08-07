import type { MediaType } from "@/lib/media-type"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"

export interface QuickAnalysisRecord {
  id: string
  organization_id: string
  created_by: string | null
  file_name: string
  storage_path: string
  media_type: MediaType
  page_count: number | null
  created_at: string
  updated_at: string
}

export interface CreateQuickAnalysisInput {
  id: string
  organizationId: string
  fileName: string
  storagePath: string
  mediaType: MediaType
  pageCount?: number | null
}

export interface RunQuickAnalysisInput {
  quickAnalysisId: string
  analysisType: PersistedAiAnalysisType
  pageNumber: number
  clientImage?: {
    data: string
    mimeType: string
    width: number
    height: number
  }
}

export interface RunQuickAnalysisResult {
  suggestions: import("@/components/communication/comments-panel").AISuggestion[]
  analysisType: PersistedAiAnalysisType
  pageNumber: number
  imageWidth: number
  imageHeight: number
  empty: boolean
}
