import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  completeInferenceLog,
  failInferenceLog,
  startInferenceLog,
  type InferenceLogContext,
} from "@/lib/ai-inference-logger"
import {
  getInferenceApiBaseUrl,
  getInferenceApiTimeoutMs,
  getMaxInferenceFileBytes,
} from "@/lib/inference-config"

async function dumpOutgoingInferenceImage(
  endpoint: InferenceEndpoint,
  imageBuffer: Buffer,
  filename: string
): Promise<void> {
  if (process.env.AI_DEBUG_DUMP_IMAGE !== "true") {
    return
  }

  try {
    const dir = path.join(process.cwd(), "debug")
    await mkdir(dir, { recursive: true })
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const outPath = path.join(dir, `ai-sent-${endpoint}-${timestamp}-${safeName}`)
    await writeFile(outPath, imageBuffer)
    console.log("[AI Analysis] Debug image dumped", {
      endpoint,
      path: outPath,
      bytes: imageBuffer.byteLength,
    })
  } catch (error) {
    console.error("[AI Analysis] Failed to dump debug image", error)
  }
}

export type InferenceEndpoint = "gramcheck" | "wordspace" | "lineheight"

export type { InferenceLogContext }

export interface InferenceCallOptions {
  filename?: string
  mimeType?: string
  logContext?: InferenceLogContext
}

export interface InferenceCallResult {
  data: unknown
  logId: string | null
}

export class InferenceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "InferenceApiError"
  }
}

function getEndpointPath(endpoint: InferenceEndpoint): string {
  if (endpoint === "gramcheck") {
    return process.env.INFERENCE_GRAMCHECK_PATH?.trim() || "/gramcheck/"
  }
  if (endpoint === "lineheight") {
    return process.env.INFERENCE_LINEHEIGHT_PATH?.trim() || "/lineheight/"
  }
  return process.env.INFERENCE_WORDSPACE_PATH?.trim() || "/wordspace/"
}

function inferMimeType(filename?: string): string {
  if (!filename) return "application/octet-stream"
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

function formatFetchError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && error.name === "AbortError") {
    return `Inference API timed out after ${Math.round(timeoutMs / 1000)}s`
  }

  if (!(error instanceof Error)) {
    return "Inference API request failed"
  }

  const cause = error.cause
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = String(cause.code)
    return `Inference API connection failed (${code}). The EC2 server may be down, overloaded, or closed the connection during processing.`
  }

  if (error.message === "fetch failed") {
    return "Inference API connection failed. The EC2 server may be unreachable or dropped the connection during processing."
  }

  return error.message
}

export async function callInferenceApi(
  endpoint: InferenceEndpoint,
  imageBuffer: Buffer,
  options?: InferenceCallOptions
): Promise<InferenceCallResult> {
  if (imageBuffer.byteLength > getMaxInferenceFileBytes()) {
    throw new InferenceApiError("Image exceeds 50 MB inference limit", 413)
  }

  const filename = options?.filename || "creative.png"
  const mimeType = options?.mimeType || inferMimeType(filename)
  const url = `${getInferenceApiBaseUrl()}${getEndpointPath(endpoint)}`
  const timeoutMs = getInferenceApiTimeoutMs()

  const formData = new FormData()
  formData.append(
    "image",
    new Blob([new Uint8Array(imageBuffer)], { type: mimeType }),
    filename
  )

  console.log("[AI Analysis] Inference request", {
    endpoint,
    url,
    filename,
    mimeType,
    bytes: imageBuffer.byteLength,
    timeoutMs,
  })

  await dumpOutgoingInferenceImage(endpoint, imageBuffer, filename)

  const logContext = options?.logContext
  const logId =
    logContext != null
      ? await startInferenceLog(endpoint, logContext, {
          buffer: imageBuffer,
          mimeType,
        })
      : null

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    const responseText = await response.text()
    const durationMs = Date.now() - startedAt

    if (!response.ok) {
      const apiError = new InferenceApiError(
        `Inference API returned ${response.status}: ${responseText.slice(0, 300)}`,
        response.status
      )
      if (logId) {
        await failInferenceLog(logId, {
          message: apiError.message,
          status: apiError.status,
          durationMs,
        })
      }
      throw apiError
    }

    try {
      const data = JSON.parse(responseText) as unknown
      if (logId) {
        await completeInferenceLog(logId, { response: data, durationMs })
      }
      return { data, logId }
    } catch (parseError) {
      const apiError = new InferenceApiError(
        "Inference API returned non-JSON response",
        response.status,
        parseError
      )
      if (logId) {
        await failInferenceLog(logId, {
          message: apiError.message,
          status: apiError.status,
          durationMs,
        })
      }
      throw apiError
    }
  } catch (error) {
    if (error instanceof InferenceApiError) throw error

    const durationMs = Date.now() - startedAt
    const message = formatFetchError(error, timeoutMs)
    const status =
      error instanceof Error && error.name === "AbortError" ? 504 : 502

    if (logId) {
      await failInferenceLog(logId, { message, status, durationMs })
    }

    throw new InferenceApiError(message, status, error)
  } finally {
    clearTimeout(timeout)
  }
}

export async function callGramcheck(
  imageBuffer: Buffer,
  options?: InferenceCallOptions
): Promise<InferenceCallResult> {
  return callInferenceApi("gramcheck", imageBuffer, options)
}

export async function callWordspace(
  imageBuffer: Buffer,
  options?: InferenceCallOptions
): Promise<InferenceCallResult> {
  return callInferenceApi("wordspace", imageBuffer, options)
}

export async function callLineheight(
  imageBuffer: Buffer,
  options?: InferenceCallOptions
): Promise<InferenceCallResult> {
  return callInferenceApi("lineheight", imageBuffer, options)
}
