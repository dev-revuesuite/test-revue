import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

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
  options?: { filename?: string; mimeType?: string }
): Promise<unknown> {
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new InferenceApiError(
        `Inference API returned ${response.status}: ${responseText.slice(0, 300)}`,
        response.status
      )
    }

    try {
      return JSON.parse(responseText) as unknown
    } catch (parseError) {
      throw new InferenceApiError(
        "Inference API returned non-JSON response",
        response.status,
        parseError
      )
    }
  } catch (error) {
    if (error instanceof InferenceApiError) throw error

    const message = formatFetchError(error, timeoutMs)
    const status =
      error instanceof Error && error.name === "AbortError" ? 504 : 502

    throw new InferenceApiError(message, status, error)
  } finally {
    clearTimeout(timeout)
  }
}

export async function callGramcheck(
  imageBuffer: Buffer,
  options?: { filename?: string; mimeType?: string }
): Promise<unknown> {
  return callInferenceApi("gramcheck", imageBuffer, options)
}

export async function callWordspace(
  imageBuffer: Buffer,
  options?: { filename?: string; mimeType?: string }
): Promise<unknown> {
  return callInferenceApi("wordspace", imageBuffer, options)
}

export async function callLineheight(
  imageBuffer: Buffer,
  options?: { filename?: string; mimeType?: string }
): Promise<unknown> {
  return callInferenceApi("lineheight", imageBuffer, options)
}
