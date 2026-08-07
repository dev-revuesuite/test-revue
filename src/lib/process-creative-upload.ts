import type { SupabaseClient } from "@supabase/supabase-js"

import { getMediaTypeFromFile, isPdfFile } from "@/lib/media-type"
import { getPdfPageCountFromUrl } from "@/lib/pdf-page-count"
import { requestCreativePreview } from "@/lib/request-creative-preview"
import { requestPdfLinearization } from "@/lib/request-pdf-linearization"
import {
  CreativeFileUploadError,
  uploadCreativeFileWithProgress,
} from "@/lib/upload-creative-file"
import type {
  CompletedCreativeUpload,
  RoomCreativeType,
  StartCreativeUploadInput,
} from "@/types/creative-upload"

type BriefStatus =
  | "brief_received"
  | "qc_pending"
  | "review_qc"
  | "iteration_shared"
  | "feedback_received"
  | "iteration_approved"
  | "completed"

function deriveBriefStatus(
  creatives: CompletedCreativeUpload["creative"][]
): BriefStatus {
  if (creatives.length === 0) return "brief_received"
  if (creatives.every((creative) => creative.status === "completed")) {
    return "completed"
  }
  if (creatives.some((creative) => creative.status === "completed")) {
    return "feedback_received"
  }
  return "qc_pending"
}

interface ProcessCreativeUploadOptions {
  existingCreatives?: CompletedCreativeUpload["creative"][]
  onUploadProgress?: (percent: number) => void
  onPhaseChange?: (phase: "uploading" | "processing") => void
  signal?: AbortSignal
}

export async function processCreativeUpload(
  supabase: SupabaseClient,
  input: StartCreativeUploadInput,
  options: ProcessCreativeUploadOptions = {}
): Promise<CompletedCreativeUpload> {
  const { file, projectId, creativeName, creativeType } = input
  const fileMediaType = getMediaTypeFromFile(file)
  const resolvedCreativeType: RoomCreativeType =
    isPdfFile(file) ? "document" : creativeType

  options.onPhaseChange?.("uploading")

  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-")
  const path = `${projectId}/${Date.now()}-${safeName}`

  const thumbnailUrl = await uploadCreativeFileWithProgress(
    supabase,
    path,
    file,
    {
      onProgress: (percent) => {
        options.onUploadProgress?.(Math.min(percent, 90))
      },
      signal: options.signal,
    }
  )

  options.onPhaseChange?.("processing")
  options.onUploadProgress?.(92)

  const { data: inserted, error } = await supabase
    .from("creatives")
    .insert({
      project_id: projectId,
      name: creativeName.trim(),
      type: resolvedCreativeType,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single()

  if (error || !inserted) {
    throw new CreativeFileUploadError(
      "Could not save the creative. Please try again."
    )
  }

  options.onUploadProgress?.(95)

  let pageCount: number | null = null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: iterationRow } = await supabase
    .from("iterations")
    .insert({
      creative_id: inserted.id,
      version: 1,
      image_url: thumbnailUrl,
      name: "Iteration 1",
      media_type: fileMediaType ?? "image",
      created_by: user?.id,
    })
    .select("id")
    .single()

  if (fileMediaType === "pdf" && iterationRow?.id) {
    pageCount = await getPdfPageCountFromUrl(thumbnailUrl, iterationRow.id)
    if (pageCount != null) {
      await supabase
        .from("iterations")
        .update({ page_count: pageCount })
        .eq("id", iterationRow.id)
    }

    void requestCreativePreview(inserted.id)

    // Fire-and-forget: reorders the stored PDF for fast web view. Runs after
    // page count so the range reads above never race the file replacement.
    void requestPdfLinearization("creatives", path)
  }

  options.onUploadProgress?.(100)

  const creative: CompletedCreativeUpload["creative"] = {
    id: inserted.id,
    name: inserted.name,
    type: resolvedCreativeType,
    thumbnailUrl,
    mediaType: fileMediaType ?? "image",
    pageCount,
    updatedAt: "Just now",
    feedbackCount: inserted.feedback_count ?? 0,
    iteration: inserted.iteration ?? 1,
    status: (inserted.status as "in_progress" | "completed") ?? "in_progress",
  }

  const allCreatives = [...(options.existingCreatives || []), creative]
  const briefStatus = deriveBriefStatus(allCreatives)

  await supabase
    .from("projects")
    .update({ brief_status: briefStatus })
    .eq("id", projectId)

  return {
    projectId,
    creative,
    briefStatus,
  }
}
