/** Shared primitives for browser-side file and zip downloads. */

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g

/** Strip characters that are illegal in filenames on Windows/macOS. */
export function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
}

export function filenameFromUrl(url: string): string {
  try {
    const segment = new URL(url).pathname.split("/").pop() || ""
    return decodeURIComponent(segment.split("?")[0])
  } catch {
    return ""
  }
}

export const HAS_EXTENSION = /\.[a-z0-9]{1,8}$/i

/** Make `name` unique within `used`, appending `-2`, `-3`, … before the extension. */
export function uniqueName(name: string, used: Set<string>): string {
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

export function saveBlob(blob: Blob, filename: string): void {
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

export async function fetchBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const blob = await response.blob()
  if (blob.size === 0) throw new Error("Downloaded file is empty")
  return blob
}

/** Slugify a name for use as a zip filename. */
export function toSlug(value: string, fallback: string): string {
  const base = sanitizeFilename(value).replace(/\s+/g, "-").replace(/-+/g, "-")
  return base || fallback
}

const UNITS = ["B", "KB", "MB", "GB"]

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB"
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`
}
