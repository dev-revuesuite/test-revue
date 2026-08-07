import type { SupabaseClient } from "@supabase/supabase-js"

import { getMaxInferenceFileBytes } from "@/lib/inference-config"

export class QuickAnalysisStorageError extends Error {
  constructor(
    message: string,
    readonly status: number = 500
  ) {
    super(message)
    this.name = "QuickAnalysisStorageError"
  }
}

export const QUICK_ANALYSIS_BUCKET = "quick-analysis-assets"

const SIGNED_URL_TTL_SECONDS = 60 * 60

function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".pdf")) return "application/pdf"
  return "application/octet-stream"
}

export interface DownloadedQuickAnalysisFile {
  buffer: Buffer
  mimeType: string
  filename: string
  size: number
}

export async function downloadQuickAnalysisFile(
  supabase: SupabaseClient,
  storagePath: string,
  fileName: string
): Promise<DownloadedQuickAnalysisFile> {
  if (!storagePath?.trim()) {
    throw new QuickAnalysisStorageError("Quick analysis has no storage path", 400)
  }

  const maxBytes = getMaxInferenceFileBytes()
  const { data, error } = await supabase.storage
    .from(QUICK_ANALYSIS_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new QuickAnalysisStorageError(
      error?.message || "Failed to download quick analysis file",
      502
    )
  }

  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.byteLength === 0) {
    throw new QuickAnalysisStorageError("Quick analysis file is empty", 400)
  }

  if (buffer.byteLength > maxBytes) {
    throw new QuickAnalysisStorageError("Quick analysis file exceeds 50 MB limit", 413)
  }

  const mimeType = data.type || inferMimeType(fileName)

  return {
    buffer,
    mimeType,
    filename: fileName,
    size: buffer.byteLength,
  }
}

export async function createQuickAnalysisSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(QUICK_ANALYSIS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw new QuickAnalysisStorageError(
      error?.message || "Failed to create signed URL for quick analysis file",
      502
    )
  }

  return data.signedUrl
}
