import type { SupabaseClient } from "@supabase/supabase-js"

export interface BrandImageEntry {
  preview: string
  file: File | null
}

export function brandImageUrlsToEntries(urls: string[]): BrandImageEntry[] {
  return urls.map((preview) => ({ preview, file: null }))
}

export async function uploadClientBrandImages(
  supabase: SupabaseClient,
  organizationId: string,
  entries: BrandImageEntry[]
): Promise<string[]> {
  const urls: string[] = []

  for (const entry of entries) {
    if (entry.file) {
      const ext = (entry.file.name.split(".").pop() || "png").replace(/[^A-Za-z0-9]+/g, "")
      const path = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: imgErr } = await supabase.storage
        .from("client-assets")
        .upload(path, entry.file)
      if (!imgErr) {
        urls.push(supabase.storage.from("client-assets").getPublicUrl(path).data.publicUrl)
      }
      continue
    }

    if (entry.preview.startsWith("http")) {
      urls.push(entry.preview)
    }
  }

  return urls
}
