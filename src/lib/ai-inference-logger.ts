import { getDeploymentEnvironment } from "@/lib/deployment-environment"

export type InferenceLogEndpoint = "gramcheck" | "wordspace" | "lineheight"
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin"

export const AI_INFERENCE_LOGS_BUCKET = "ai-inference-logs"

export type InferenceLogSource = "studio_analysis" | "quick_analysis"

export interface InferenceLogContext {
  source: InferenceLogSource
  userId: string
  organizationId?: string | null
  iterationId?: string
  quickAnalysisId?: string
  creativeId?: string
  pageNumber?: number
  imageWidth?: number
  imageHeight?: number
}

export function isInferenceLoggingEnabled(): boolean {
  if (process.env.AI_INFERENCE_LOGGING === "false") {
    return false
  }
  return isAdminClientConfigured()
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "image/jpeg") return "jpg"
  return "bin"
}

export async function startInferenceLog(
  endpoint: InferenceLogEndpoint,
  context: InferenceLogContext,
  image: { buffer: Buffer; mimeType: string }
): Promise<string | null> {
  if (!isInferenceLoggingEnabled()) return null

  try {
    const admin = createAdminClient()
    const logId = crypto.randomUUID()
    const environment = getDeploymentEnvironment()
    const ext = extensionForMime(image.mimeType)
    const storagePath = `${environment}/${logId}/input.${ext}`

    const { error: uploadError } = await admin.storage
      .from(AI_INFERENCE_LOGS_BUCKET)
      .upload(storagePath, image.buffer, {
        contentType: image.mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[AI Inference Log] Image upload failed", uploadError)
      return null
    }

    const { error: insertError } = await admin.from("ai_inference_logs").insert({
      id: logId,
      status: "running",
      environment,
      endpoint,
      source: context.source,
      user_id: context.userId,
      organization_id: context.organizationId ?? null,
      iteration_id: context.iterationId ?? null,
      quick_analysis_id: context.quickAnalysisId ?? null,
      creative_id: context.creativeId ?? null,
      page_number: context.pageNumber ?? null,
      image_storage_path: storagePath,
      image_bytes: image.buffer.byteLength,
      image_width: context.imageWidth ?? null,
      image_height: context.imageHeight ?? null,
    })

    if (insertError) {
      console.error("[AI Inference Log] Insert failed", insertError)
      await admin.storage.from(AI_INFERENCE_LOGS_BUCKET).remove([storagePath])
      return null
    }

    return logId
  } catch (error) {
    console.error("[AI Inference Log] startInferenceLog failed", error)
    return null
  }
}

export async function completeInferenceLog(
  logId: string,
  payload: {
    response: unknown
    durationMs: number
  }
): Promise<void> {
  if (!isInferenceLoggingEnabled()) return

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("ai_inference_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        duration_ms: Math.max(0, Math.round(payload.durationMs)),
        response_json: payload.response as Record<string, unknown>,
      })
      .eq("id", logId)
      .eq("status", "running")

    if (error) {
      console.error("[AI Inference Log] completeInferenceLog failed", error)
    }
  } catch (error) {
    console.error("[AI Inference Log] completeInferenceLog failed", error)
  }
}

export async function failInferenceLog(
  logId: string,
  payload: {
    message: string
    status?: number
    durationMs: number
  }
): Promise<void> {
  if (!isInferenceLoggingEnabled()) return

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("ai_inference_logs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: Math.max(0, Math.round(payload.durationMs)),
        error_message: payload.message.slice(0, 4000),
        error_status: payload.status ?? null,
      })
      .eq("id", logId)

    if (error) {
      console.error("[AI Inference Log] failInferenceLog failed", error)
    }
  } catch (error) {
    console.error("[AI Inference Log] failInferenceLog failed", error)
  }
}

export async function updateInferenceLogSuggestionCount(
  logId: string | null,
  suggestionCount: number
): Promise<void> {
  if (!logId || !isInferenceLoggingEnabled()) return

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("ai_inference_logs")
      .update({ suggestion_count: suggestionCount })
      .eq("id", logId)

    if (error) {
      console.error("[AI Inference Log] updateSuggestionCount failed", error)
    }
  } catch (error) {
    console.error("[AI Inference Log] updateSuggestionCount failed", error)
  }
}
