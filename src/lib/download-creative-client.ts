import type { MediaType } from "@/lib/media-type"

function filenameFromUrl(imageUrl: string): string {
  try {
    const pathname = new URL(imageUrl).pathname
    const segment = pathname.split("/").pop() || "creative"
    return decodeURIComponent(segment.split("?")[0])
  } catch {
    return "creative"
  }
}

function extensionFromFilename(filename: string): string | null {
  const match = filename.match(/\.(pdf|png|jpe?g|webp|gif)$/i)
  return match ? `.${match[1]!.toLowerCase()}` : null
}

function extensionForMediaType(mediaType: MediaType): string {
  return mediaType === "pdf" ? ".pdf" : ".png"
}

function sanitizeFilenameBase(value: string): string {
  const trimmed = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
  const normalized = trimmed.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
  return normalized.slice(0, 80) || "creative"
}

export function buildCreativeDownloadFilename(
  imageUrl: string,
  options: {
    creativeName?: string
    version?: number
    mediaType?: MediaType
  } = {}
): string {
  const urlFilename = filenameFromUrl(imageUrl)
  const urlExtension = extensionFromFilename(urlFilename)
  const mediaType = options.mediaType ?? "image"
  const extension = urlExtension ?? extensionForMediaType(mediaType)
  const base = sanitizeFilenameBase(options.creativeName || urlFilename.replace(/\.[^.]+$/, ""))
  const versionSuffix =
    options.version != null && Number.isFinite(options.version)
      ? `-v${options.version}`
      : ""

  return `${base}${versionSuffix}${extension}`
}

export async function downloadCreativeInBrowser(
  imageUrl: string,
  options: {
    creativeName?: string
    version?: number
    mediaType?: MediaType
  } = {}
): Promise<void> {
  if (!imageUrl.trim()) {
    throw new Error("No file to download")
  }

  const response = await fetch(imageUrl, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const blob = await response.blob()
  if (blob.size === 0) {
    throw new Error("Downloaded file is empty")
  }

  const filename = buildCreativeDownloadFilename(imageUrl, options)
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
