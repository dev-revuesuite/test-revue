import type { SupabaseClient } from "@supabase/supabase-js"

import {
  CREATIVES_BUCKET,
  CreativeStorageError,
  downloadCreativeFile,
} from "@/lib/creative-storage"
import { isPdfUrl } from "@/lib/media-type"
import { renderPdfPage } from "@/lib/pdf-render-server"

/**
 * Generates the `creatives.preview_url` image.
 *
 * `thumbnail_url` is the file the user uploaded -- a .pdf for documents, which
 * no <img> can render. This renders page 1 of that PDF to a JPEG and stores the
 * result in `preview_url`. `thumbnail_url` is never touched: other code reads it
 * to infer media type (see `resolveIterationMediaType`).
 */

/** Card thumbnails are ~400px wide at 2x DPI; 600 covers that with headroom. */
const PREVIEW_WIDTH_PX = 600
const PREVIEW_MAX_HEIGHT_PX = 2000
const PREVIEW_JPEG_QUALITY = 80
const PREVIEW_CACHE_CONTROL = "31536000" // 1 year; page 1 of a given PDF never changes

export class CreativePreviewError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "CreativePreviewError"
  }
}

function previewStoragePath(creativeId: string): string {
  return `previews/${creativeId}.jpg`
}

interface CreativeForPreview {
  id: string
  thumbnail_url: string | null
  preview_url: string | null
}

/**
 * Only team members (admins/designers) may trigger a render, reusing the same
 * RPC that guards AI analysis. Clients simply read whatever `preview_url` holds.
 */
async function assertCanGeneratePreview(
  supabase: SupabaseClient,
  creativeId: string
): Promise<CreativeForPreview> {
  const { data: creative, error } = await supabase
    .from("creatives")
    .select("id, thumbnail_url, preview_url")
    .eq("id", creativeId)
    .single()

  if (error || !creative) {
    throw new CreativePreviewError("Creative not found", 404)
  }

  const { data: iteration } = await supabase
    .from("iterations")
    .select("id")
    .eq("creative_id", creativeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!iteration) {
    throw new CreativePreviewError("Creative has no uploaded file", 404)
  }

  const { data: isMember, error: rpcError } = await supabase.rpc(
    "user_is_team_member_for_iteration",
    { p_iteration_id: iteration.id }
  )

  if (rpcError) {
    throw new CreativePreviewError("Failed to verify project access", 500)
  }

  if (!isMember) {
    throw new CreativePreviewError(
      "Only admins and designers on this project can generate previews",
      403
    )
  }

  return creative as CreativeForPreview
}

export interface CreativePreviewResult {
  previewUrl: string | null
  /**
   * Why no render happened, when previewUrl is null or already present.
   * Every reason here is final -- retrying will produce the same answer, so
   * callers should stop asking.
   */
  reason?: "not-a-pdf" | "already-generated" | "too-large"
}

/**
 * Idempotent: safe to call repeatedly. Returns the existing preview when one is
 * already stored, and null for creatives that need no preview (plain images).
 */
export async function generateCreativePreview(
  supabase: SupabaseClient,
  creativeId: string
): Promise<CreativePreviewResult> {
  const creative = await assertCanGeneratePreview(supabase, creativeId)

  if (creative.preview_url) {
    return { previewUrl: creative.preview_url, reason: "already-generated" }
  }

  const sourceUrl = creative.thumbnail_url
  if (!sourceUrl || !isPdfUrl(sourceUrl)) {
    return { previewUrl: null, reason: "not-a-pdf" }
  }

  let buffer: Buffer
  try {
    ;({ buffer } = await downloadCreativeFile(sourceUrl))
  } catch (error) {
    // The 50 MB ceiling is an inference-server limit we inherit. A PDF over it
    // simply has no preview; that is a final answer, not a failure to retry.
    if (error instanceof CreativeStorageError && error.status === 413) {
      return { previewUrl: null, reason: "too-large" }
    }
    throw error
  }

  const rendered = await renderPdfPage(buffer, 1, {
    scale: 1,
    minWidthPx: PREVIEW_WIDTH_PX,
    maxWidthPx: PREVIEW_WIDTH_PX,
    maxHeightPx: PREVIEW_MAX_HEIGHT_PX,
    quality: PREVIEW_JPEG_QUALITY,
  })

  const path = previewStoragePath(creativeId)
  const { error: uploadError } = await supabase.storage
    .from(CREATIVES_BUCKET)
    .upload(path, rendered.imageBuffer, {
      contentType: rendered.mimeType,
      cacheControl: PREVIEW_CACHE_CONTROL,
      upsert: true,
    })

  if (uploadError) {
    throw new CreativePreviewError(
      `Failed to store preview: ${uploadError.message}`,
      502
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CREATIVES_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase
    .from("creatives")
    .update({ preview_url: publicUrl })
    .eq("id", creativeId)

  if (updateError) {
    throw new CreativePreviewError(
      `Failed to save preview URL: ${updateError.message}`,
      500
    )
  }

  return { previewUrl: publicUrl }
}
