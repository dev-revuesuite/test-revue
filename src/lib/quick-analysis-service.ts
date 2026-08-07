import type { SupabaseClient } from "@supabase/supabase-js"

import type { AISuggestion } from "@/components/communication/comments-panel"
import {
  AiAnalysisClientImageError,
  decodeClientAnalysisImage,
  type ClientAnalysisImageInput,
} from "@/lib/ai-analysis-client-image"
import {
  callGramcheck,
  callLineheight,
  callWordspace,
  InferenceApiError,
} from "@/lib/inference-api"
import { normalizeAnalysisImageForInference } from "@/lib/normalize-analysis-image"
import {
  parseGramcheckResponse,
  parseLineheightResponse,
  parseWordspaceResponse,
  type ParsedInferenceSuggestion,
} from "@/lib/inference-response-parser"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"
import {
  mapQuickAnalysisSuggestionRow,
  type QuickAnalysisSuggestionRow,
} from "@/lib/map-quick-analysis-suggestion-rows"
import {
  assertCanAccessQuickAnalysis,
  QuickAnalysisAccessError,
  type QuickAnalysisForRun,
} from "@/lib/quick-analysis-access"
import {
  downloadQuickAnalysisFile,
  QuickAnalysisStorageError,
} from "@/lib/quick-analysis-storage"
import type {
  CreateQuickAnalysisInput,
  RunQuickAnalysisInput,
  RunQuickAnalysisResult,
} from "@/types/quick-analysis"

const AI_ANALYSIS_DEBUG_LOG = process.env.AI_ANALYSIS_DEBUG_LOG === "true"

export class QuickAnalysisServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "QuickAnalysisServiceError"
  }
}

interface PreparedAnalysisImage {
  buffer: Buffer
  mimeType: string
  filename: string
  width: number
  height: number
  sourceWidth?: number
  sourceHeight?: number
  resized?: boolean
}

async function finalizeAnalysisImage(input: {
  buffer: Buffer
  mimeType: string
  filename: string
}): Promise<PreparedAnalysisImage> {
  try {
    const normalized = await normalizeAnalysisImageForInference(input)
    return {
      buffer: normalized.buffer,
      mimeType: normalized.mimeType,
      filename: normalized.filename,
      width: normalized.width,
      height: normalized.height,
      sourceWidth: normalized.sourceWidth,
      sourceHeight: normalized.sourceHeight,
      resized: normalized.resized,
    }
  } catch (error) {
    throw new QuickAnalysisServiceError(
      "Failed to prepare image for AI analysis",
      500,
      error
    )
  }
}

async function callAnalysisApi(
  analysisType: PersistedAiAnalysisType,
  image: PreparedAnalysisImage
): Promise<unknown> {
  const options = {
    filename: image.filename,
    mimeType: image.mimeType,
  }

  switch (analysisType) {
    case "spelling":
      return callGramcheck(image.buffer, options)
    case "lineheight":
      return callLineheight(image.buffer, options)
    case "spacing":
      return callWordspace(image.buffer, options)
  }
}

function parseAnalysisResponse(
  analysisType: PersistedAiAnalysisType,
  rawResponse: unknown
): ParsedInferenceSuggestion[] {
  switch (analysisType) {
    case "spelling":
      return parseGramcheckResponse(rawResponse)
    case "lineheight":
      return parseLineheightResponse(rawResponse)
    case "spacing":
      return parseWordspaceResponse(rawResponse)
  }
}

function mapParsedSuggestionsToRows(
  parsed: ParsedInferenceSuggestion[],
  runId: string,
  quickAnalysisId: string,
  pageNumber: number,
  analysisType: PersistedAiAnalysisType
) {
  return parsed.map((item) => ({
    run_id: runId,
    quick_analysis_id: quickAnalysisId,
    page_number: pageNumber,
    analysis_type: analysisType,
    label: item.label,
    description: item.description,
    bbox_x1: item.bbox.x1,
    bbox_y1: item.bbox.y1,
    bbox_x2: item.bbox.x2,
    bbox_y2: item.bbox.y2,
    severity: item.severity,
    sort_order: item.sortOrder,
    ignored: false,
  }))
}

async function fetchSuggestionsForRun(
  supabase: SupabaseClient,
  runId: string
): Promise<AISuggestion[]> {
  const { data, error } = await supabase
    .from("quick_analysis_suggestions")
    .select(
      "id, run_id, quick_analysis_id, page_number, analysis_type, label, description, bbox_x1, bbox_y1, bbox_x2, bbox_y2, severity, sort_order, ignored, created_at, quick_analysis_runs(image_width, image_height)"
    )
    .eq("run_id", runId)
    .eq("ignored", false)
    .order("sort_order", { ascending: true })

  if (error) {
    throw new QuickAnalysisServiceError(
      "Failed to load saved AI suggestions",
      500,
      error
    )
  }

  return ((data || []) as QuickAnalysisSuggestionRow[])
    .map((row) => mapQuickAnalysisSuggestionRow(row))
    .filter((row): row is AISuggestion => row !== null)
}

async function prepareAnalysisImageWithSupabase(
  supabase: SupabaseClient,
  analysis: QuickAnalysisForRun,
  pageNumber: number,
  clientImage?: ClientAnalysisImageInput
): Promise<PreparedAnalysisImage> {
  if (analysis.media_type === "pdf") {
    const maxPage = analysis.page_count ?? 1
    if (pageNumber < 1 || pageNumber > maxPage) {
      throw new QuickAnalysisServiceError(
        `Page number must be between 1 and ${maxPage}`,
        400
      )
    }

    if (!clientImage) {
      throw new QuickAnalysisServiceError(
        "PDF analysis requires a browser canvas snapshot",
        400
      )
    }

    return finalizeAnalysisImage(
      await decodeClientAnalysisImage(clientImage, pageNumber)
    )
  }

  if (clientImage) {
    throw new QuickAnalysisServiceError(
      "Client canvas snapshots are only supported for PDF files",
      400
    )
  }

  const downloaded = await downloadQuickAnalysisFile(
    supabase,
    analysis.storage_path,
    analysis.file_name
  )

  return finalizeAnalysisImage({
    buffer: downloaded.buffer,
    mimeType: downloaded.mimeType,
    filename: downloaded.filename,
  })
}

export async function createQuickAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: CreateQuickAnalysisInput
): Promise<{ id: string }> {
  const { id, organizationId, fileName, storagePath, mediaType, pageCount } =
    input

  const { data, error } = await supabase
    .from("quick_analyses")
    .insert({
      id,
      organization_id: organizationId,
      created_by: userId,
      file_name: fileName,
      storage_path: storagePath,
      media_type: mediaType,
      page_count: pageCount ?? (mediaType === "pdf" ? null : 1),
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new QuickAnalysisServiceError(
      error?.message || "Failed to create quick analysis",
      500,
      error
    )
  }

  return { id: data.id }
}

export async function runQuickAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: RunQuickAnalysisInput
): Promise<RunQuickAnalysisResult> {
  const { quickAnalysisId, analysisType, pageNumber, clientImage } = input

  if (pageNumber < 1) {
    throw new QuickAnalysisServiceError("pageNumber must be at least 1", 400)
  }

  const analysis = await assertCanAccessQuickAnalysis(
    supabase,
    quickAnalysisId
  )

  const image = await prepareAnalysisImageWithSupabase(
    supabase,
    analysis,
    pageNumber,
    clientImage
  )

  console.log("[Quick AI Analysis] Prepared image", {
    quickAnalysisId,
    analysisType,
    pageNumber,
    mediaType: analysis.media_type,
    source: analysis.media_type === "pdf" ? "client-canvas" : "storage-download",
    width: image.width,
    height: image.height,
    bytes: image.buffer.byteLength,
  })

  let rawResponse: unknown
  try {
    rawResponse = await callAnalysisApi(analysisType, image)
  } catch (error) {
    if (error instanceof InferenceApiError) {
      throw new QuickAnalysisServiceError(
        error.message,
        error.status ?? 502,
        error
      )
    }
    throw error
  }

  const parsed = parseAnalysisResponse(analysisType, rawResponse)

  if (AI_ANALYSIS_DEBUG_LOG) {
    console.log("[Quick AI Analysis] EC2 response", {
      quickAnalysisId,
      analysisType,
      pageNumber,
      parsedCount: parsed.length,
      rawResponse,
      parsed,
    })
  }

  const { error: deleteError } = await supabase
    .from("quick_analysis_runs")
    .delete()
    .eq("quick_analysis_id", quickAnalysisId)
    .eq("page_number", pageNumber)
    .eq("analysis_type", analysisType)

  if (deleteError) {
    throw new QuickAnalysisServiceError(
      "Failed to replace previous AI analysis run",
      500,
      deleteError
    )
  }

  const { data: run, error: runError } = await supabase
    .from("quick_analysis_runs")
    .insert({
      quick_analysis_id: quickAnalysisId,
      page_number: pageNumber,
      analysis_type: analysisType,
      status: "completed",
      image_width: image.width,
      image_height: image.height,
      raw_response: rawResponse as Record<string, unknown>,
      created_by: userId,
    })
    .select("id")
    .single()

  if (runError || !run) {
    throw new QuickAnalysisServiceError(
      "Failed to save AI analysis run",
      500,
      runError
    )
  }

  if (parsed.length > 0) {
    const suggestionRows = mapParsedSuggestionsToRows(
      parsed,
      run.id,
      quickAnalysisId,
      pageNumber,
      analysisType
    )

    const { error: suggestionsError } = await supabase
      .from("quick_analysis_suggestions")
      .insert(suggestionRows)

    if (suggestionsError) {
      await supabase.from("quick_analysis_runs").delete().eq("id", run.id)
      throw new QuickAnalysisServiceError(
        "Failed to save AI suggestions",
        500,
        suggestionsError
      )
    }
  }

  const suggestions = await fetchSuggestionsForRun(supabase, run.id)

  return {
    suggestions,
    analysisType,
    pageNumber,
    imageWidth: image.width,
    imageHeight: image.height,
    empty: suggestions.length === 0,
  }
}

export async function ignoreQuickAnalysisSuggestion(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<void> {
  const { error } = await supabase
    .from("quick_analysis_suggestions")
    .update({ ignored: true })
    .eq("id", suggestionId)

  if (error) {
    throw new QuickAnalysisServiceError(
      "Failed to ignore AI suggestion",
      500,
      error
    )
  }
}

export function toQuickAnalysisServiceError(
  error: unknown
): QuickAnalysisServiceError {
  if (error instanceof QuickAnalysisServiceError) return error
  if (error instanceof QuickAnalysisAccessError) {
    return new QuickAnalysisServiceError(error.message, error.status, error)
  }
  if (error instanceof QuickAnalysisStorageError) {
    return new QuickAnalysisServiceError(error.message, error.status, error)
  }
  if (error instanceof InferenceApiError) {
    return new QuickAnalysisServiceError(
      error.message,
      error.status ?? 502,
      error
    )
  }
  if (error instanceof AiAnalysisClientImageError) {
    return new QuickAnalysisServiceError(error.message, error.status, error)
  }

  return new QuickAnalysisServiceError(
    error instanceof Error ? error.message : "Quick AI analysis failed",
    500,
    error
  )
}
