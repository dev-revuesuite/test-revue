import {
  AI_INFERENCE_LOGS_BUCKET,
} from "@/lib/ai-inference-logger"
import type { DeploymentEnvironment } from "@/lib/deployment-environment"
import { createAdminClient } from "@/lib/supabase/admin"

export interface AiInferenceLogListItem {
  id: string
  created_at: string
  finished_at: string | null
  status: "running" | "success" | "failed"
  environment: DeploymentEnvironment
  endpoint: string
  source: string
  user_id: string | null
  duration_ms: number | null
  suggestion_count: number | null
  error_message: string | null
  iteration_id: string | null
  quick_analysis_id: string | null
}

export interface AiInferenceLogDetail extends AiInferenceLogListItem {
  organization_id: string | null
  creative_id: string | null
  page_number: number | null
  image_bytes: number | null
  image_width: number | null
  image_height: number | null
  response_json: unknown
  error_status: number | null
  image_url: string | null
}

const LIST_COLUMNS =
  "id, created_at, finished_at, status, environment, endpoint, source, user_id, duration_ms, suggestion_count, error_message, iteration_id, quick_analysis_id"

export async function listAiInferenceLogs(params: {
  environment?: DeploymentEnvironment | "all"
  endpoint?: string
  status?: string
  source?: string
  limit: number
  offset: number
}): Promise<{ rows: AiInferenceLogListItem[]; total: number }> {
  const admin = createAdminClient()
  let query = admin
    .from("ai_inference_logs")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.environment && params.environment !== "all") {
    query = query.eq("environment", params.environment)
  }
  if (params.endpoint) {
    query = query.eq("endpoint", params.endpoint)
  }
  if (params.status) {
    query = query.eq("status", params.status)
  }
  if (params.source) {
    query = query.eq("source", params.source)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(error.message)
  }

  return {
    rows: (data || []) as AiInferenceLogListItem[],
    total: count ?? 0,
  }
}

export async function getAiInferenceLogDetail(
  id: string
): Promise<AiInferenceLogDetail | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("ai_inference_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  const row = data as Record<string, unknown>

  let imageUrl: string | null = null
  const storagePath =
    typeof row.image_storage_path === "string" ? row.image_storage_path : null
  if (storagePath) {
    const { data: signed, error: signError } = await admin.storage
      .from(AI_INFERENCE_LOGS_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (!signError && signed?.signedUrl) {
      imageUrl = signed.signedUrl
    }
  }

  return {
    ...(row as unknown as AiInferenceLogListItem),
    organization_id:
      typeof row.organization_id === "string" ? row.organization_id : null,
    creative_id: typeof row.creative_id === "string" ? row.creative_id : null,
    page_number: typeof row.page_number === "number" ? row.page_number : null,
    image_bytes: typeof row.image_bytes === "number" ? row.image_bytes : null,
    image_width: typeof row.image_width === "number" ? row.image_width : null,
    image_height: typeof row.image_height === "number" ? row.image_height : null,
    response_json: row.response_json,
    error_status: typeof row.error_status === "number" ? row.error_status : null,
    image_url: imageUrl,
  }
}
