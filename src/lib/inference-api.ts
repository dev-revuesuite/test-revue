import { randomUUID } from "node:crypto"
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
  getRevueApiKey,
} from "@/lib/inference-config"
import { signRevueRequest } from "@/lib/revue-signing"

/**
 * Client for the REVUE page-check API. Follows gateway-contract.md:
 * signed requests (§5), a body with Content-Length (§3), the size limit (§4),
 * status/reason handling (§7) and the 280 s time limit (§8). No retries: a busy
 * API is reported to the user as "try again later" and the QC run is refunded
 * by the caller (`withQcRun`).
 */

/** gateway-contract.md §4: the whole request body, file plus multipart wrapping. */
const MAX_REQUEST_BODY_BYTES = 36_275_776

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

/** Machine-readable codes the UI can react to. */
export type InferenceErrorCode =
  | "QC_BUSY"
  | "QC_PAGE_TOO_LARGE"
  | "QC_PAGE_UNREADABLE"
  | "QC_PAGE_DECLINED"
  | "QC_UNAVAILABLE"
  | "QC_FAILED"

export interface InferenceErrorDetails {
  code?: InferenceErrorCode
  /** The API's `reason` word, when it gave one. */
  reason?: string
  /** The request id to quote when something has to be looked into. */
  requestId?: string
  /** Technical description for logs; never shown to users. */
  detail?: string
}

/**
 * `message` is safe to show to the user; `status` is the status our own route
 * should answer with (not necessarily the upstream one).
 */
export class InferenceApiError extends Error {
  readonly code?: InferenceErrorCode
  readonly reason?: string
  readonly requestId?: string
  readonly detail?: string

  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
    details: InferenceErrorDetails = {}
  ) {
    super(message)
    this.name = "InferenceApiError"
    this.code = details.code
    this.reason = details.reason
    this.requestId = details.requestId
    this.detail = details.detail
  }
}

const BUSY_MESSAGE = "The checker is busy. Please try again later."
const UNAVAILABLE_MESSAGE =
  "The check isn't available right now. Please try again later."

interface ClassifiedFailure {
  status: number
  code: InferenceErrorCode
  message: string
  /** True when the fault is in our own setup (key, clock, request) and needs an alert. */
  ourFault: boolean
}

/** gateway-contract.md §7: decide by the status and the `reason`, never by the text. */
function classifyUpstreamFailure(
  upstreamStatus: number,
  reason: string | undefined
): ClassifiedFailure {
  if (upstreamStatus === 413) {
    return {
      status: 413,
      code: "QC_PAGE_TOO_LARGE",
      message: "This page is too large to check.",
      ourFault: false,
    }
  }
  if (upstreamStatus === 400 && reason === "size_unreadable") {
    return {
      status: 422,
      code: "QC_PAGE_UNREADABLE",
      message: "This file can't be read as an image.",
      ourFault: false,
    }
  }
  if (upstreamStatus === 500 && reason === "model_declined") {
    return {
      status: 422,
      code: "QC_PAGE_DECLINED",
      message: "The checker can't check this page.",
      ourFault: false,
    }
  }
  if (upstreamStatus === 502 || upstreamStatus === 503 || upstreamStatus === 504) {
    return { status: 503, code: "QC_BUSY", message: BUSY_MESSAGE, ourFault: false }
  }
  if (upstreamStatus === 500) {
    return {
      status: 502,
      code: "QC_FAILED",
      message: "The check failed. Please try again later.",
      ourFault: false,
    }
  }
  // 401 (key, signature or clock), other 400s, 404, 405, 411 and anything
  // unexpected are faults in our own setup. Never pass a 401 on to the browser:
  // the user is not at fault.
  return {
    status: 502,
    code: "QC_UNAVAILABLE",
    message: UNAVAILABLE_MESSAGE,
    ourFault: true,
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

function describeFetchError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return `Inference API timed out after ${Math.round(timeoutMs / 1000)}s`
  }
  if (!(error instanceof Error)) {
    return "Inference API request failed"
  }
  const cause = error.cause
  if (cause && typeof cause === "object" && "code" in cause) {
    return `Inference API connection failed (${String(cause.code)})`
  }
  return error.message
}

/** The multipart body as bytes, so it can be hashed and sent unchanged with a Content-Length. */
async function buildMultipartBody(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ body: Uint8Array<ArrayBuffer>; contentType: string }> {
  const form = new FormData()
  form.append("image", new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), filename)
  const packed = new Request("http://localhost/", { method: "POST", body: form })
  const body = new Uint8Array(await packed.arrayBuffer())
  const contentType = packed.headers.get("content-type")
  if (!contentType) {
    throw new Error("Failed to build multipart body")
  }
  return { body, contentType }
}

function parseErrorBody(text: string): { reason?: string; requestId?: string; serverTime?: unknown } {
  try {
    const json = JSON.parse(text) as Record<string, unknown>
    return {
      reason: typeof json.reason === "string" ? json.reason : undefined,
      requestId: typeof json.request_id === "string" ? json.request_id : undefined,
      serverTime: json.server_time,
    }
  } catch {
    return {}
  }
}

export async function callInferenceApi(
  endpoint: InferenceEndpoint,
  imageBuffer: Buffer,
  options?: InferenceCallOptions
): Promise<InferenceCallResult> {
  const filename = options?.filename || "creative.png"
  const mimeType = options?.mimeType || inferMimeType(filename)
  const url = new URL(`${getInferenceApiBaseUrl()}${getEndpointPath(endpoint)}`)
  const timeoutMs = getInferenceApiTimeoutMs()
  const requestId = randomUUID()

  const { body, contentType } = await buildMultipartBody(imageBuffer, filename, mimeType)
  if (body.byteLength > MAX_REQUEST_BODY_BYTES) {
    throw new InferenceApiError("This page is too large to check.", 413, undefined, {
      code: "QC_PAGE_TOO_LARGE",
      requestId,
      detail: `Request body ${body.byteLength} bytes exceeds ${MAX_REQUEST_BODY_BYTES}`,
    })
  }

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "X-Request-ID": requestId,
  }

  const key = getRevueApiKey()
  if (key) {
    const time = Math.floor(Date.now() / 1000)
    // Sign the path exactly as requested (includes any base-URL prefix and query).
    const signedPath = `${url.pathname}${url.search}`
    const { bodyHash, signature } = signRevueRequest({
      secret: key.secret,
      time,
      method: "POST",
      path: signedPath,
      body,
    })
    headers["X-Revue-Key"] = key.keyName
    headers["X-Revue-Time"] = String(time)
    headers["X-Revue-Content-SHA256"] = bodyHash
    headers["X-Revue-Signature"] = signature
  }

  console.log("[AI Analysis] Inference request", {
    endpoint,
    url: url.toString(),
    requestId,
    signed: key != null,
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

  let response: Response
  let responseText: string
  try {
    // A byte array has a known length, so fetch sends Content-Length (§3: no chunked uploads).
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    })
    responseText = await response.text()
  } catch (error) {
    // §7: a time-out or lost connection is handled like a 503.
    const detail = describeFetchError(error, timeoutMs)
    const durationMs = Date.now() - startedAt
    console.error("[AI Analysis] Inference request failed", { endpoint, requestId, detail })
    if (logId) {
      await failInferenceLog(logId, { message: detail, status: 503, durationMs })
    }
    throw new InferenceApiError(BUSY_MESSAGE, 503, error, {
      code: "QC_BUSY",
      requestId,
      detail,
    })
  }

  const durationMs = Date.now() - startedAt
  const answerRequestId = response.headers.get("x-request-id") || requestId

  if (!response.ok) {
    const parsed = parseErrorBody(responseText)
    const failure = classifyUpstreamFailure(response.status, parsed.reason)
    const detail = `Inference API returned ${response.status}${
      parsed.reason ? ` (${parsed.reason})` : ""
    }: ${responseText.slice(0, 300)}`

    const logPayload = {
      endpoint,
      status: response.status,
      reason: parsed.reason,
      requestId: parsed.requestId || answerRequestId,
      ...(parsed.serverTime !== undefined ? { serverTime: parsed.serverTime } : {}),
    }
    if (failure.ourFault) {
      console.error("[AI Analysis] REVUE API refused the request (check key, clock or request)", logPayload)
    } else {
      console.warn("[AI Analysis] Inference API error", logPayload)
    }

    if (logId) {
      await failInferenceLog(logId, { message: detail, status: response.status, durationMs })
    }
    throw new InferenceApiError(failure.message, failure.status, undefined, {
      code: failure.code,
      reason: parsed.reason,
      requestId: parsed.requestId || answerRequestId,
      detail,
    })
  }

  let data: unknown
  try {
    data = JSON.parse(responseText) as unknown
  } catch (parseError) {
    const detail = "Inference API returned non-JSON response"
    if (logId) {
      await failInferenceLog(logId, { message: detail, status: response.status, durationMs })
    }
    throw new InferenceApiError("The check failed. Please try again later.", 502, parseError, {
      code: "QC_FAILED",
      requestId: answerRequestId,
      detail,
    })
  }

  if (logId) {
    await completeInferenceLog(logId, { response: data, durationMs })
  }
  return { data, logId }
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
