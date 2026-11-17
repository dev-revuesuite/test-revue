import type { SupabaseClient } from "@supabase/supabase-js"

import {
  isStorageUploadBlocked,
  uploadWithQuota,
  type UploadWithQuotaResult,
} from "@/lib/upload-with-quota"

export interface BrandImageEntry {
  preview: string
  file: File | null
}

export function brandImageUrlsToEntries(urls: string[]): BrandImageEntry[] {
  return urls.map((preview) => ({ preview, file: null }))
}

/** Collects finished uploads so they can be discarded if saving the client fails. */
export type ClientAssetUploads = UploadWithQuotaResult[]

export async function discardClientAssetUploads(uploads: ClientAssetUploads): Promise<void> {
  await Promise.all(uploads.map((upload) => upload.discard()))
}

/**
 * Uploads a client logo, brand image or font through the app server (permission
 * and the plan's storage limit). Returns null when the upload didn't happen; a
 * plan refusal has already shown its dialog.
 */
export async function uploadClientAsset(
  supabase: SupabaseClient,
  category: "brand" | "font" | "client_logo",
  organizationId: string,
  file: File,
  uploads?: ClientAssetUploads
): Promise<string | null> {
  try {
    const upload = await uploadWithQuota(supabase, {
      category,
      file,
      target: { organizationId },
    })
    uploads?.push(upload)
    return upload.publicUrl
  } catch (error) {
    if (!isStorageUploadBlocked(error)) {
      console.error(`Failed to upload client ${category}:`, error)
    }
    return null
  }
}

export async function uploadClientBrandImages(
  supabase: SupabaseClient,
  organizationId: string,
  entries: BrandImageEntry[],
  uploads?: ClientAssetUploads
): Promise<string[]> {
  const urls: string[] = []

  for (const entry of entries) {
    if (entry.file) {
      const url = await uploadClientAsset(supabase, "brand", organizationId, entry.file, uploads)
      if (url) urls.push(url)
      continue
    }

    if (entry.preview.startsWith("http")) {
      urls.push(entry.preview)
    }
  }

  return urls
}
