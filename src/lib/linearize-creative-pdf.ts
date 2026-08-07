import type { SupabaseClient } from "@supabase/supabase-js"

import {
  CREATIVES_BUCKET,
  CREATIVE_FILE_CACHE_CONTROL,
} from "@/lib/creative-storage"
import {
  isPdfAlreadyLinearized,
  linearizePdfBuffer,
  PdfLinearizeError,
} from "@/lib/linearize-pdf"

export const REVUE_ASSETS_BUCKET = "revue-assets"

/**
 * Linearization holds the input + output PDF in WASM memory, so the ceiling is
 * bounded by available RAM, not the 50MB AI-inference limit. 500MB keeps peak
 * usage around ~1GB; override with LINEARIZE_PDF_MAX_BYTES if needed.
 */
const DEFAULT_MAX_LINEARIZE_PDF_BYTES = 500 * 1024 * 1024

function getMaxLinearizePdfBytes(): number {
  const raw = process.env.LINEARIZE_PDF_MAX_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_LINEARIZE_PDF_BYTES
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_LINEARIZE_PDF_BYTES
}

export type CreativePdfBucket = typeof CREATIVES_BUCKET | typeof REVUE_ASSETS_BUCKET

const ALLOWED_BUCKETS = new Set<string>([CREATIVES_BUCKET, REVUE_ASSETS_BUCKET])

export function assertValidPdfStoragePath(storagePath: string): void {
  const normalized = storagePath.trim()

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.includes("\\")
  ) {
    throw new PdfLinearizeError("Invalid storage path", 400)
  }

  if (!normalized.toLowerCase().endsWith(".pdf")) {
    throw new PdfLinearizeError("Not a PDF path", 400)
  }
}

export interface LinearizeCreativePdfResult {
  linearized: boolean
  skipped: boolean
}

export async function linearizeCreativePdfInStorage(
  supabase: SupabaseClient,
  bucket: CreativePdfBucket,
  storagePath: string
): Promise<LinearizeCreativePdfResult> {
  assertValidPdfStoragePath(storagePath)

  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new PdfLinearizeError("Invalid bucket", 400)
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(storagePath)

  if (downloadError || !blob) {
    throw new PdfLinearizeError(
      "Could not read uploaded PDF",
      downloadError ? 403 : 404
    )
  }

  if (blob.size > getMaxLinearizePdfBytes()) {
    throw new PdfLinearizeError("PDF exceeds linearization size limit", 413)
  }

  const input = Buffer.from(await blob.arrayBuffer())

  if (isPdfAlreadyLinearized(input)) {
    return { linearized: false, skipped: true }
  }

  let output: Buffer

  try {
    output = await linearizePdfBuffer(input)
  } catch (error) {
    console.error("[linearize-pdf] keeping original file:", error)
    return { linearized: false, skipped: true }
  }

  if (output.byteLength === input.byteLength && output.equals(input)) {
    return { linearized: false, skipped: true }
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, output, {
      upsert: true,
      contentType: "application/pdf",
      cacheControl: CREATIVE_FILE_CACHE_CONTROL,
    })

  if (uploadError) {
    throw new PdfLinearizeError("Could not save linearized PDF", 500)
  }

  return { linearized: true, skipped: false }
}
