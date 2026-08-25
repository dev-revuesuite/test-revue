import type { SupabaseClient } from "@supabase/supabase-js"

import { getMediaTypeFromFile, isPdfFile } from "@/lib/media-type"
import { getPdfPageCountFromUrl } from "@/lib/pdf-page-count"
import { requestCreativePreview } from "@/lib/request-creative-preview"
import { requestPdfLinearization } from "@/lib/request-pdf-linearization"
import {
  CreativeFileUploadError,
  uploadCreativeFileWithProgress,
} from "@/lib/upload-creative-file"
import { touchClientActivityByProjectId } from "@/lib/touch-client-activity"
import {
  deriveProjectBriefStatusFromCreatives,
  type CreativePipelineStatus,
} from "@/lib/creative-pipeline-status"
import { syncProjectBriefStatusFromCreatives } from "@/lib/update-creative-pipeline-status"
import { createInitialIterationForCreative } from "@/lib/ensure-initial-iteration"
import type {
  CompletedCreativeUpload,
  RoomCreativeType,
  StartCreativeUploadInput,
} from "@/types/creative-upload"

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let iterationId: string
  try {
    iterationId = await createInitialIterationForCreative(supabase, {
      creativeId: inserted.id,
      imageUrl: thumbnailUrl,
      mediaType: fileMediaType ?? "image",
      creativeType: resolvedCreativeType,
      userId: user?.id,
      file,
    })
  } catch (iterationError) {
    console.error("Creative iteration failed:", iterationError)
    await supabase.from("creatives").delete().eq("id", inserted.id)
    throw new CreativeFileUploadError(
      "Could not save the creative iteration. Please try again."
    )
  }

  let pageCount: number | null = null

  if (fileMediaType === "pdf") {
    pageCount = await getPdfPageCountFromUrl(thumbnailUrl, iterationId)
    if (pageCount != null) {
      await supabase
        .from("iterations")
        .update({ page_count: pageCount })
        .eq("id", iterationId)
    }

    void requestCreativePreview(inserted.id)

    // Await web-copy linearization while still in "processing". Original is
    // never overwritten; viewers pick up `.web.pdf` once it exists.
    await requestPdfLinearization("creatives", path, options.signal)
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
    status: (inserted.status as CreativePipelineStatus) ?? "qc_pending",
  }

  const allCreatives = [...(options.existingCreatives || []), creative]
  const briefStatus = deriveProjectBriefStatusFromCreatives(
    allCreatives.map((item) => item.status)
  )

  await syncProjectBriefStatusFromCreatives(supabase, projectId)

  await touchClientActivityByProjectId(supabase, projectId)

  return {
    projectId,
    creative,
    briefStatus,
  }
}
