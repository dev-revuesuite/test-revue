import JSZip from "jszip"

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

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g

/** Strip characters that are illegal in filenames on Windows/macOS. */
function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
}

function filenameFromUrl(url: string): string {
  try {
    const segment = new URL(url).pathname.split("/").pop() || ""
    return decodeURIComponent(segment.split("?")[0])
  } catch {
    return ""
  }
}

const HAS_EXTENSION = /\.[a-z0-9]{1,8}$/i

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

function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const blob = await response.blob()
  if (blob.size === 0) throw new Error("Downloaded file is empty")
  return blob
}

/**
 * Download one reference file. Fetches as a blob rather than relying on the
 * `download` attribute, which browsers ignore for cross-origin URLs.
 */
export async function downloadReference(ref: DownloadableReference): Promise<void> {
  if (!ref.url?.trim()) throw new Error("This reference has no file to download")
  saveBlob(await fetchBlob(ref.url), referenceFilename(ref))
}

/** Make `name` unique within `used`, appending `-2`, `-3`, … before the extension. */
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf(".")
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ""

  let counter = 2
  let candidate = `${base}-${counter}${ext}`
  while (used.has(candidate)) {
    counter += 1
    candidate = `${base}-${counter}${ext}`
  }
  used.add(candidate)
  return candidate
}

function zipFilename(projectName: string): string {
  const base = sanitizeFilename(projectName).replace(/\s+/g, "-").replace(/-+/g, "-")
  return `${base || "references"}-references.zip`
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
