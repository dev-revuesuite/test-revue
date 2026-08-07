import type { SupabaseClient } from "@supabase/supabase-js"

import {
  assertAllowedCreativeUrl,
  CreativeStorageError,
} from "@/lib/creative-storage"
import { resolveIterationMediaType } from "@/lib/media-type"

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

  return { sourceUrl: iteration.image_url }
}
