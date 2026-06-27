import { imageSize } from "image-size"

import { getMaxInferenceFileBytes } from "@/lib/inference-config"

export interface ClientAnalysisImageInput {
  data: string
  mimeType: string
  width: number
  height: number
}

export interface DecodedClientAnalysisImage {
  buffer: Buffer
  mimeType: string
  filename: string
  width: number
  height: number
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export class AiAnalysisClientImageError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message)
    this.name = "AiAnalysisClientImageError"
  }
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  return "jpg"
}

function stripDataUrlPrefix(data: string): string {
  const trimmed = data.trim()
  if (!trimmed.startsWith("data:")) {
    return trimmed
  }

  const commaIndex = trimmed.indexOf(",")
  if (commaIndex === -1) {
    throw new AiAnalysisClientImageError("Invalid client image data URL")
  }

  return trimmed.slice(commaIndex + 1)
}

export function parseClientAnalysisImagePayload(
  raw: unknown
): ClientAnalysisImageInput | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const payload = raw as Record<string, unknown>
  const data = typeof payload.data === "string" ? payload.data.trim() : ""
  const mimeType =
    typeof payload.mimeType === "string"
      ? payload.mimeType.trim().toLowerCase()
      : ""
  const width = typeof payload.width === "number" ? payload.width : Number.NaN
  const height = typeof payload.height === "number" ? payload.height : Number.NaN

  if (!data || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return null
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    return null
  }

  return {
    data,
    mimeType,
    width: Math.floor(width),
    height: Math.floor(height),
  }
}

export function decodeClientAnalysisImage(
  payload: ClientAnalysisImageInput,
  pageNumber: number
): DecodedClientAnalysisImage {
  let buffer: Buffer

  try {
    buffer = Buffer.from(stripDataUrlPrefix(payload.data), "base64")
  } catch {
    throw new AiAnalysisClientImageError("Invalid client image encoding")
  }

  if (buffer.byteLength === 0) {
    throw new AiAnalysisClientImageError("Client image is empty")
  }

  if (buffer.byteLength > getMaxInferenceFileBytes()) {
    throw new AiAnalysisClientImageError("Client image exceeds 50 MB limit", 413)
  }

  let dimensions: ReturnType<typeof imageSize>
  try {
    dimensions = imageSize(buffer)
  } catch {
    throw new AiAnalysisClientImageError("Could not read client image dimensions")
  }

  if (!dimensions?.width || !dimensions?.height) {
    throw new AiAnalysisClientImageError("Could not read client image dimensions")
  }

  if (
    dimensions.width !== payload.width ||
    dimensions.height !== payload.height
  ) {
    throw new AiAnalysisClientImageError(
      `Client image dimensions mismatch (expected ${payload.width}x${payload.height}, got ${dimensions.width}x${dimensions.height})`
    )
  }

  const extension = extensionForMimeType(payload.mimeType)

  return {
    buffer,
    mimeType: payload.mimeType,
    filename: `page-${pageNumber}.${extension}`,
    width: dimensions.width,
    height: dimensions.height,
  }
}
