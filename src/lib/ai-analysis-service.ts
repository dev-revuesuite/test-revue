import type { SupabaseClient } from "@supabase/supabase-js"

import type { AISuggestion } from "@/components/communication/comments-panel"
import {
  AiAnalysisClientImageError,
  decodeClientAnalysisImage,
  type ClientAnalysisImageInput,
} from "@/lib/ai-analysis-client-image"
import {
  AiAnalysisAccessError,
  assertCanRunAiAnalysis,
  type IterationForAnalysis,
} from "@/lib/ai-analysis-access"
import { downloadCreativeFile, CreativeStorageError } from "@/lib/creative-storage"
import {
  callGramcheck,
  callWordspace,
  InferenceApiError,
} from "@/lib/inference-api"
import {
  normalizeAnalysisImageForInference,
} from "@/lib/normalize-analysis-image"
import {
  parseGramcheckResponse,
  parseWordspaceResponse,
  type ParsedInferenceSuggestion,
} from "@/lib/inference-response-parser"
import {
  mapAiSuggestionRow,
  type AiSuggestionRow,
  type PersistedAiAnalysisType,
} from "@/lib/map-ai-suggestion-rows"

const AI_ANALYSIS_DEBUG_LOG = process.env.AI_ANALYSIS_DEBUG_LOG === "true"

export class AiAnalysisServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "AiAnalysisServiceError"
  }
}

export interface RunAiAnalysisInput {
  iterationId: string
  analysisType: PersistedAiAnalysisType
  pageNumber: number
  clientImage?: ClientAnalysisImageInput
}

export interface RunAiAnalysisResult {
  suggestions: AISuggestion[]
  analysisType: PersistedAiAnalysisType
  pageNumber: number
  imageWidth: number
  imageHeight: number
  empty: boolean
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

async function finalizeAnalysisImage(
  input: {
    buffer: Buffer
    mimeType: string
    filename: string
  }
): Promise<PreparedAnalysisImage> {
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
    throw new AiAnalysisServiceError(
      "Failed to prepare image for AI analysis",
      500,
      error
    )
  }
}

function analysisTypeToEndpoint(
  analysisType: PersistedAiAnalysisType
): "gramcheck" | "wordspace" {
  return analysisType === "spelling" ? "gramcheck" : "wordspace"
}

async function prepareAnalysisImage(
  iteration: IterationForAnalysis,
  pageNumber: number,
  clientImage?: ClientAnalysisImageInput
): Promise<PreparedAnalysisImage> {
  if (iteration.media_type === "pdf") {
    const maxPage = iteration.page_count ?? 1
    if (pageNumber < 1 || pageNumber > maxPage) {
      throw new AiAnalysisServiceError(
        `Page number must be between 1 and ${maxPage}`,
        400
      )
    }

    if (!clientImage) {
      throw new AiAnalysisServiceError(
        "PDF analysis requires a browser canvas snapshot",
        400
      )
    }

    return finalizeAnalysisImage(
      await decodeClientAnalysisImage(clientImage, pageNumber)
    )
  }

  if (clientImage) {
    throw new AiAnalysisServiceError(
      "Client canvas snapshots are only supported for PDF creatives",
      400
    )
  }

  const downloaded = await downloadCreativeFile(iteration.image_url)
  return finalizeAnalysisImage({
    buffer: downloaded.buffer,
    mimeType: downloaded.mimeType,
    filename: downloaded.filename,
  })
}

async function callAnalysisApi(
  analysisType: PersistedAiAnalysisType,
  image: PreparedAnalysisImage
): Promise<unknown> {
  const options = {
    filename: image.filename,
    mimeType: image.mimeType,
  }

  if (analysisType === "spelling") {
    return callGramcheck(image.buffer, options)
  }

  return callWordspace(image.buffer, options)
}

function mapParsedSuggestionsToRows(
  parsed: ParsedInferenceSuggestion[],
  runId: string,
  iterationId: string,
  pageNumber: number,
  analysisType: PersistedAiAnalysisType
) {
  return parsed.map((item) => ({
    run_id: runId,
    iteration_id: iterationId,
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
    .from("ai_suggestions")
    .select(
      "id, run_id, iteration_id, page_number, analysis_type, label, description, bbox_x1, bbox_y1, bbox_x2, bbox_y2, severity, sort_order, ignored, created_at, ai_analysis_runs(image_width, image_height)"
    )
    .eq("run_id", runId)
    .eq("ignored", false)
    .order("sort_order", { ascending: true })

  if (error) {
    throw new AiAnalysisServiceError("Failed to load saved AI suggestions", 500, error)
  }

  return ((data || []) as AiSuggestionRow[])
    .map((row) => mapAiSuggestionRow(row))
    .filter((row): row is AISuggestion => row !== null)
}

export async function runAiAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: RunAiAnalysisInput
): Promise<RunAiAnalysisResult> {
  const { iterationId, analysisType, pageNumber, clientImage } = input

  if (pageNumber < 1) {
    throw new AiAnalysisServiceError("pageNumber must be at least 1", 400)
  }

  const access = await assertCanRunAiAnalysis(supabase, userId, iterationId)
  const image = await prepareAnalysisImage(
    access.iteration,
    pageNumber,
    clientImage
  )

  console.log("[AI Analysis] Prepared image", {
    iterationId,
    analysisType,
    pageNumber,
    mediaType: access.iteration.media_type,
    source:
      access.iteration.media_type === "pdf" ? "client-canvas" : "storage-download",
    width: image.width,
    height: image.height,
    sourceWidth: image.sourceWidth,
    sourceHeight: image.sourceHeight,
    resized: image.resized ?? false,
    bytes: image.buffer.byteLength,
    filename: image.filename,
    mimeType: image.mimeType,
  })

  let rawResponse: unknown
  try {
    rawResponse = await callAnalysisApi(analysisType, image)
  } catch (error) {
    if (error instanceof InferenceApiError) {
      throw new AiAnalysisServiceError(
        error.message,
        error.status ?? 502,
        error
      )
    }
    throw error
  }

  const parsed =
    analysisType === "spelling"
      ? parseGramcheckResponse(rawResponse)
      : parseWordspaceResponse(rawResponse)

  if (AI_ANALYSIS_DEBUG_LOG) {
    console.log("[AI Analysis] EC2 response", {
      iterationId,
      analysisType,
      pageNumber,
      imageWidth: image.width,
      imageHeight: image.height,
      parsedCount: parsed.length,
      rawResponse,
      parsed,
    })
  } else {
    console.log("[AI Analysis] EC2 response", {
      iterationId,
      analysisType,
      pageNumber,
      imageWidth: image.width,
      imageHeight: image.height,
      parsedCount: parsed.length,
    })
  }

  const { error: deleteError } = await supabase
    .from("ai_analysis_runs")
    .delete()
    .eq("iteration_id", iterationId)
    .eq("page_number", pageNumber)
    .eq("analysis_type", analysisType)

  if (deleteError) {
    throw new AiAnalysisServiceError(
      "Failed to replace previous AI analysis run",
      500,
      deleteError
    )
  }

  const { data: run, error: runError } = await supabase
    .from("ai_analysis_runs")
    .insert({
      iteration_id: iterationId,
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
    throw new AiAnalysisServiceError(
      "Failed to save AI analysis run",
      500,
      runError
    )
  }

  if (parsed.length > 0) {
    const suggestionRows = mapParsedSuggestionsToRows(
      parsed,
      run.id,
      iterationId,
      pageNumber,
      analysisType
    )

    const { error: suggestionsError } = await supabase
      .from("ai_suggestions")
      .insert(suggestionRows)

    if (suggestionsError) {
      await supabase.from("ai_analysis_runs").delete().eq("id", run.id)
      throw new AiAnalysisServiceError(
        "Failed to save AI suggestions",
        500,
        suggestionsError
      )
    }
  }

  const suggestions = await fetchSuggestionsForRun(supabase, run.id)

  if (AI_ANALYSIS_DEBUG_LOG) {
    console.log("[AI Analysis] Saved to DB", {
      runId: run.id,
      iterationId,
      analysisType,
      pageNumber,
      suggestionCount: suggestions.length,
      suggestions,
    })
  } else {
    console.log("[AI Analysis] Saved to DB", {
      runId: run.id,
      iterationId,
      analysisType,
      pageNumber,
      suggestionCount: suggestions.length,
    })
  }

  return {
    suggestions,
    analysisType,
    pageNumber,
    imageWidth: image.width,
    imageHeight: image.height,
    empty: suggestions.length === 0,
  }
}

export async function ignoreAiSuggestion(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<void> {
  const { error } = await supabase
    .from("ai_suggestions")
    .update({ ignored: true })
    .eq("id", suggestionId)

  if (error) {
    throw new AiAnalysisServiceError("Failed to ignore AI suggestion", 500, error)
  }
}

export function toServiceError(error: unknown): AiAnalysisServiceError {
  if (error instanceof AiAnalysisServiceError) return error
  if (error instanceof AiAnalysisAccessError) {
    return new AiAnalysisServiceError(error.message, error.status, error)
  }
  if (error instanceof CreativeStorageError) {
    return new AiAnalysisServiceError(error.message, error.status, error)
  }
  if (error instanceof InferenceApiError) {
    return new AiAnalysisServiceError(
      error.message,
      error.status ?? 502,
      error
    )
  }
  if (error instanceof AiAnalysisClientImageError) {
    return new AiAnalysisServiceError(error.message, error.status, error)
  }

  return new AiAnalysisServiceError(
    error instanceof Error ? error.message : "AI analysis failed",
    500,
    error
  )
}
