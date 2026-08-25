import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMediaTypeFromFile,
  getMediaTypeFromUrl,
  type MediaType,
} from "@/lib/media-type"
import { ensureProjectMemberAccessForCreative } from "@/lib/ensure-project-member-access"

function resolveMediaType(
  thumbnailUrl: string,
  creativeType?: string | null
): MediaType {
  if (creativeType === "document") return "pdf"
  return getMediaTypeFromUrl(thumbnailUrl)
}

/**
 * Ensure a creative with an uploaded file has at least one row in `iterations`.
 * Revue reads iterations, not creatives.thumbnail_url — backfill when missing.
 */
export async function ensureInitialIterationForCreative(
  supabase: SupabaseClient,
  creativeId: string,
  options: { userId?: string | null } = {}
): Promise<boolean> {
  const { data: existing, error: existingError } = await supabase
    .from("iterations")
    .select("id")
    .eq("creative_id", creativeId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    return false
  }

  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("id, thumbnail_url, type, iteration")
    .eq("id", creativeId)
    .single()

  if (creativeError || !creative) {
    throw creativeError ?? new Error("Creative not found")
  }

  const thumbnailUrl = creative.thumbnail_url?.trim()
  if (!thumbnailUrl) {
    return false
  }

  if (options.userId) {
    await ensureProjectMemberAccessForCreative(
      supabase,
      creativeId,
      options.userId
    )
  }

  const mediaType = resolveMediaType(thumbnailUrl, creative.type)

  const { error: insertError } = await supabase.from("iterations").insert({
    creative_id: creativeId,
    version: creative.iteration ?? 1,
    name: "Iteration 1",
    image_url: thumbnailUrl,
    media_type: mediaType,
    created_by: options.userId ?? null,
  })

  if (insertError) {
    throw insertError
  }

  return true
}

/** Insert iteration v1 when uploading a creative file (Room / Brief). */
export async function createInitialIterationForCreative(
  supabase: SupabaseClient,
  input: {
    creativeId: string
    imageUrl: string
    mediaType?: MediaType
    creativeType?: string | null
    userId?: string | null
    file?: File | null
  }
): Promise<string> {
  const mediaType =
    input.mediaType ??
    (input.file ? getMediaTypeFromFile(input.file) : undefined) ??
    resolveMediaType(input.imageUrl, input.creativeType)

  if (input.userId) {
    await ensureProjectMemberAccessForCreative(
      supabase,
      input.creativeId,
      input.userId
    )
  }

  const { data: iterationRow, error } = await supabase
    .from("iterations")
    .insert({
      creative_id: input.creativeId,
      version: 1,
      image_url: input.imageUrl,
      name: "Iteration 1",
      media_type: mediaType,
      created_by: input.userId ?? null,
    })
    .select("id")
    .single()

  if (error || !iterationRow) {
    throw error ?? new Error("Failed to create iteration")
  }

  return iterationRow.id
}
