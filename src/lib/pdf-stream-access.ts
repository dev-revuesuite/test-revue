import type { SupabaseClient } from "@supabase/supabase-js"

import {
  assertAllowedCreativeUrl,
  CreativeStorageError,
} from "@/lib/creative-storage"
import { resolveIterationMediaType } from "@/lib/media-type"
import { toWebPdfPublicUrl } from "@/lib/pdf-web-copy"

export class PdfStreamAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "PdfStreamAccessError"
  }
}

export interface IterationPdfStreamSource {
  sourceUrl: string
  /** True when streaming the linearized `.web.pdf` sibling. */
  usingWebCopy: boolean
}

const WEB_COPY_HEAD_TIMEOUT_MS = 8_000

async function webCopyExists(webUrl: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), WEB_COPY_HEAD_TIMEOUT_MS)

  try {
    const response = await fetch(webUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Prefer a validated linearized sibling for viewing when it exists.
 * Downloads keep using `iterations.image_url` (the original) elsewhere.
 */
export async function resolvePdfViewSourceUrl(
  originalUrl: string
): Promise<{ sourceUrl: string; usingWebCopy: boolean }> {
  const webUrl = toWebPdfPublicUrl(originalUrl)
  if (!webUrl || webUrl === originalUrl) {
    return { sourceUrl: originalUrl, usingWebCopy: false }
  }

  try {
    assertAllowedCreativeUrl(webUrl)
  } catch {
    return { sourceUrl: originalUrl, usingWebCopy: false }
  }

  if (await webCopyExists(webUrl)) {
    return { sourceUrl: webUrl, usingWebCopy: true }
  }

  return { sourceUrl: originalUrl, usingWebCopy: false }
}

export async function getIterationPdfStreamSource(
  supabase: SupabaseClient,
  iterationId: string
): Promise<IterationPdfStreamSource> {
  const { data: iteration, error } = await supabase
    .from("iterations")
    .select("id, image_url, media_type")
    .eq("id", iterationId)
    .single()

  if (error || !iteration) {
    throw new PdfStreamAccessError("Iteration not found", 404)
  }

  if (!iteration.image_url?.trim()) {
    throw new PdfStreamAccessError("Iteration has no file", 404)
  }

  const mediaType = resolveIterationMediaType(
    iteration.media_type,
    iteration.image_url
  )

  if (mediaType !== "pdf") {
    throw new PdfStreamAccessError("Iteration is not a PDF", 400)
  }

  try {
    assertAllowedCreativeUrl(iteration.image_url)
  } catch (err) {
    if (err instanceof CreativeStorageError) {
      throw new PdfStreamAccessError(err.message, err.status)
    }
    throw new PdfStreamAccessError("Invalid creative file URL", 400)
  }

  const { sourceUrl, usingWebCopy } = await resolvePdfViewSourceUrl(
    iteration.image_url
  )

  return { sourceUrl, usingWebCopy }
}
