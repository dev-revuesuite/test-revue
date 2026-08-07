import { getMaxInferenceFileBytes } from "@/lib/inference-config"

export class CreativeStorageError extends Error {
  constructor(
    message: string,
    readonly status: number = 500
  ) {
    super(message)
    this.name = "CreativeStorageError"
  }
}

export const CREATIVES_BUCKET = "creatives"
/** Uploaded originals use timestamped paths and are never overwritten. */
export const CREATIVE_FILE_CACHE_CONTROL = "31536000"
const REVUE_ASSETS_BUCKET = "revue-assets"
const ALLOWED_BUCKETS = [CREATIVES_BUCKET, REVUE_ASSETS_BUCKET]
const DOWNLOAD_TIMEOUT_MS = 60_000

function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".pdf")) return "application/pdf"
  return "application/octet-stream"
}

function filenameFromUrl(imageUrl: string): string {
  try {
    const pathname = new URL(imageUrl).pathname
    const segment = pathname.split("/").pop() || "creative"
    return decodeURIComponent(segment.split("?")[0])
  } catch {
    return "creative"
  }
}

function getSupabaseStorageOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!configured) return null

  try {
    return new URL(configured).origin
  } catch {
    return null
  }
}

function isAllowedStoragePath(pathname: string): boolean {
  for (const bucket of ALLOWED_BUCKETS) {
    const publicMarker = `/storage/v1/object/public/${bucket}/`
    const signMarker = `/storage/v1/object/sign/${bucket}/`
    if (pathname.includes(publicMarker) || pathname.includes(signMarker)) {
      return true
    }
  }
  return false
}

export function assertAllowedCreativeUrl(imageUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    throw new CreativeStorageError("Invalid creative file URL", 400)
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new CreativeStorageError("Invalid creative file URL", 400)
  }

  const supabaseOrigin = getSupabaseStorageOrigin()
  if (!supabaseOrigin || parsed.origin !== supabaseOrigin) {
    throw new CreativeStorageError("Creative file URL is not from allowed storage", 403)
  }

  if (!isAllowedStoragePath(parsed.pathname)) {
    throw new CreativeStorageError("Creative file URL is not from allowed storage", 403)
  }

  return parsed
}

async function readBoundedResponseBody(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  const contentLength = response.headers.get("content-length")
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10)
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new CreativeStorageError("Creative file exceeds 50 MB limit", 413)
    }
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > maxBytes) {
      throw new CreativeStorageError("Creative file exceeds 50 MB limit", 413)
    }
    return Buffer.from(arrayBuffer)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new CreativeStorageError("Creative file exceeds 50 MB limit", 413)
    }

    chunks.push(value)
  }

  return Buffer.concat(chunks)
}

export function parseCreativesStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl)
    const publicMarker = `/storage/v1/object/public/${CREATIVES_BUCKET}/`
    const publicIdx = url.pathname.indexOf(publicMarker)
    if (publicIdx !== -1) {
      return decodeURIComponent(url.pathname.slice(publicIdx + publicMarker.length))
    }

    const signMarker = `/storage/v1/object/sign/${CREATIVES_BUCKET}/`
    const signIdx = url.pathname.indexOf(signMarker)
    if (signIdx !== -1) {
      const remainder = url.pathname.slice(signIdx + signMarker.length)
      return decodeURIComponent(remainder.split("/")[0] ?? remainder)
    }
  } catch {
    return null
  }

  return null
}

export interface DownloadedCreativeFile {
  buffer: Buffer
  mimeType: string
  filename: string
  size: number
}

export async function downloadCreativeFile(
  imageUrl: string
): Promise<DownloadedCreativeFile> {
  if (!imageUrl?.trim()) {
    throw new CreativeStorageError("Iteration has no image URL", 400)
  }

  const validatedUrl = assertAllowedCreativeUrl(imageUrl)
  const maxBytes = getMaxInferenceFileBytes()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  try {
    const response = await fetch(validatedUrl.href, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new CreativeStorageError(
        `Failed to download creative file (${response.status})`,
        502
      )
    }

    const buffer = await readBoundedResponseBody(response, maxBytes)
    const size = buffer.byteLength

    if (size === 0) {
      throw new CreativeStorageError("Creative file is empty", 400)
    }

    const filename = filenameFromUrl(imageUrl)
    const mimeType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      inferMimeType(filename)

    return { buffer, mimeType, filename, size }
  } catch (error) {
    if (error instanceof CreativeStorageError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new CreativeStorageError("Creative file download timed out", 502)
    }

    throw new CreativeStorageError("Failed to download creative file", 502)
  } finally {
    clearTimeout(timeoutId)
  }
}

const HEAD_TIMEOUT_MS = 10_000

/**
 * Byte size of a stored creative file, via a HEAD request. Returns null when the
 * server does not report Content-Length -- callers treat that as "unknown", not
 * an error, since size is only used for a download-size warning.
 */
export async function getCreativeFileSize(
  imageUrl: string
): Promise<number | null> {
  if (!imageUrl?.trim()) return null

  let validatedUrl: URL
  try {
    validatedUrl = assertAllowedCreativeUrl(imageUrl)
  } catch {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)

  try {
    const response = await fetch(validatedUrl.href, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) return null

    const contentLength = response.headers.get("content-length")
    if (!contentLength) return null

    const parsed = Number.parseInt(contentLength, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export { inferMimeType as inferCreativeMimeType }
