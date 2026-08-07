import JSZip from "jszip"

import type {
  DownloadManifest,
  DownloadableIteration,
} from "@/lib/creative-download-manifest"
import { buildCreativeDownloadFilename } from "@/lib/download-creative-client"
import {
  fetchBlob,
  formatBytes,
  sanitizeFilename,
  saveBlob,
  toSlug,
  uniqueName,
} from "@/lib/download-utils"

/**
 * Zips a project's creatives in the browser.
 *
 * JSZip holds every file in memory, then the assembled blob on top -- roughly
 * double the total size. Hence the ceilings below, and STORE rather than
 * DEFLATE: JPEG, PNG and PDF are already compressed, so deflating them costs
 * memory and CPU to save ~2%.
 */

/** Above this, ask the user to confirm before starting. */
export const ZIP_WARN_BYTES = 300 * 1024 * 1024
/** Above this, refuse: the tab would likely be killed. */
export const ZIP_MAX_BYTES = 500 * 1024 * 1024

/** Files fetched at once. Total memory is the same; this just paces the network. */
const FETCH_CONCURRENCY = 4

export type CreativeFilter = "all" | "image" | "pdf"

export interface DownloadProgress {
  completed: number
  total: number
  currentName: string
}

export interface DownloadCreativesResult {
  downloaded: number
  /** Names of files whose fetch failed; the zip still contains the rest. */
  failed: string[]
}

export interface DownloadCreativesOptions {
  filter?: CreativeFilter
  onProgress?: (progress: DownloadProgress) => void
  signal?: AbortSignal
}

interface PlannedFile {
  creativeName: string
  creativeStatus: string | null
  iteration: DownloadableIteration
}

/** Flatten the manifest to the files a given filter would include. */
export function planDownload(
  manifest: DownloadManifest,
  filter: CreativeFilter = "all"
): PlannedFile[] {
  const planned: PlannedFile[] = []

  for (const creative of manifest.creatives) {
    for (const iteration of creative.iterations) {
      if (filter !== "all" && iteration.mediaType !== filter) continue
      planned.push({
        creativeName: creative.name,
        creativeStatus: creative.status,
        iteration,
      })
    }
  }

  return planned
}

/** Sum of known sizes for the planned files. Unknown sizes count as zero. */
export function plannedBytes(files: PlannedFile[]): number {
  return files.reduce((sum, file) => sum + (file.iteration.bytes ?? 0), 0)
}

export function isOverLimit(bytes: number): boolean {
  return bytes > ZIP_MAX_BYTES
}

export function needsSizeConfirmation(bytes: number): boolean {
  return bytes > ZIP_WARN_BYTES && bytes <= ZIP_MAX_BYTES
}

function iterationDownloadFilename(
  file: PlannedFile,
  manifest: DownloadManifest
): string {
  return buildCreativeDownloadFilename(file.iteration.url, {
    creativeName: file.creativeName,
    version: file.iteration.version,
    mediaType: file.iteration.mediaType,
    namingColumns: manifest.namingColumns,
    namingContext: {
      brandName: manifest.brandName,
      clientName: manifest.clientName,
      projectName: manifest.projectName,
      date: file.iteration.createdAt ?? undefined,
      status: file.creativeStatus ?? undefined,
    },
  })
}

export async function downloadProjectCreatives(
  manifest: DownloadManifest,
  options: DownloadCreativesOptions = {}
): Promise<DownloadCreativesResult> {
  const { filter = "all", onProgress, signal } = options

  const files = planDownload(manifest, filter)
  if (files.length === 0) throw new Error("No files match this filter")

  const totalBytes = plannedBytes(files)
  if (isOverLimit(totalBytes)) {
    throw new Error(
      `This download is ${formatBytes(totalBytes)}, over the ${formatBytes(
        ZIP_MAX_BYTES
      )} limit. Filter by type or download fewer files.`
    )
  }

  const zip = new JSZip()
  const failed: string[] = []
  // Names must be unique per folder, not globally.
  const usedNamesByFolder = new Map<string, Set<string>>()
  let completed = 0

  const queue = [...files]

  const worker = async () => {
    while (queue.length > 0) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

      const file = queue.shift()
      if (!file) break

      const label = `${file.creativeName} v${file.iteration.version}`
      onProgress?.({ completed, total: files.length, currentName: label })

      try {
        const blob = await fetchBlob(file.iteration.url, signal)

        const folder = sanitizeFilename(file.creativeName) || "creative"
        let used = usedNamesByFolder.get(folder)
        if (!used) {
          used = new Set<string>()
          usedNamesByFolder.set(folder, used)
        }

        zip
          .folder(folder)!
          .file(uniqueName(iterationDownloadFilename(file, manifest), used), blob)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error
        failed.push(label)
      }

      completed += 1
      onProgress?.({ completed, total: files.length, currentName: label })
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, files.length) }, worker)
  )

  const downloaded = files.length - failed.length
  if (downloaded === 0) throw new Error("Could not download any files")

  const blob = await zip.generateAsync({
    type: "blob",
    // Already-compressed formats; deflating them buys nothing.
    compression: "STORE",
  })

  saveBlob(blob, `${toSlug(manifest.projectName, "project")}.zip`)

  return { downloaded, failed }
}
