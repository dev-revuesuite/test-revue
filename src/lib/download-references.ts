import JSZip from "jszip"

import {
  HAS_EXTENSION,
  fetchBlob,
  filenameFromUrl,
  sanitizeFilename,
  saveBlob,
  toSlug,
  uniqueName,
} from "@/lib/download-utils"

/** A brief reference file. `url` is absent for links / files that never uploaded. */
export interface DownloadableReference {
  id: string
  name: string
  url?: string
}

export interface DownloadAllResult {
  /** How many files made it into the zip. */
  downloaded: number
  /** Names of references whose file could not be fetched. */
  failed: string[]
}

/**
 * Best filename for a reference. Prefers the reference's own name (the original
 * upload name), falling back to the storage filename. Never invents an
 * extension — references can be any file type.
 */
export function referenceFilename(ref: DownloadableReference): string {
  const fromName = sanitizeFilename(ref.name || "")
  if (fromName && HAS_EXTENSION.test(fromName)) return fromName

  const fromUrl = sanitizeFilename(ref.url ? filenameFromUrl(ref.url) : "")
  if (fromUrl && HAS_EXTENSION.test(fromUrl)) return fromUrl

  return fromName || fromUrl || "reference"
}

/**
 * Download one reference file. Fetches as a blob rather than relying on the
 * `download` attribute, which browsers ignore for cross-origin URLs.
 */
export async function downloadReference(ref: DownloadableReference): Promise<void> {
  if (!ref.url?.trim()) throw new Error("This reference has no file to download")
  saveBlob(await fetchBlob(ref.url), referenceFilename(ref))
}

function zipFilename(projectName: string): string {
  return `${toSlug(projectName, "references")}-references.zip`
}

/**
 * Zip every reference that has a file and save it as one download.
 * Individual fetch failures are collected rather than aborting the whole zip;
 * only if every file fails does this throw.
 */
export async function downloadAllReferences(
  refs: DownloadableReference[],
  projectName: string
): Promise<DownloadAllResult> {
  const withFiles = refs.filter((r) => r.url?.trim())
  if (withFiles.length === 0) throw new Error("No downloadable reference files")

  const fetched = await Promise.all(
    withFiles.map(async (ref) => {
      try {
        return { ref, blob: await fetchBlob(ref.url!) }
      } catch {
        return { ref, blob: null }
      }
    })
  )

  const zip = new JSZip()
  const used = new Set<string>()
  const failed: string[] = []

  for (const { ref, blob } of fetched) {
    if (!blob) {
      failed.push(ref.name)
      continue
    }
    zip.file(uniqueName(referenceFilename(ref), used), blob)
  }

  const downloaded = withFiles.length - failed.length
  if (downloaded === 0) throw new Error("Could not download any reference files")

  saveBlob(await zip.generateAsync({ type: "blob" }), zipFilename(projectName))
  return { downloaded, failed }
}
