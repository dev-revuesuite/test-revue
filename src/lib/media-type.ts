export type MediaType = "image" | "pdf"

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  )
}

/** Extension from URL path (ignores query string). */
export function getUrlExtension(url: string): string {
  if (!url) return ""
  try {
    const pathname = new URL(url, "http://localhost").pathname
    const base = pathname.split("/").pop() || ""
    return base.split(".").pop()?.toLowerCase() || ""
  } catch {
    const withoutQuery = url.split("?")[0]
    return withoutQuery.split(".").pop()?.toLowerCase() || ""
  }
}

export function isPdfUrl(url: string): boolean {
  return getUrlExtension(url) === "pdf"
}

export function getMediaTypeFromUrl(url: string): MediaType {
  return isPdfUrl(url) ? "pdf" : "image"
}

export function getMediaTypeFromFile(file: File): MediaType {
  return isPdfFile(file) ? "pdf" : "image"
}

/** Prefer DB `media_type`; fall back to URL when column is missing or generic. */
export function resolveIterationMediaType(
  dbMediaType: string | null | undefined,
  imageUrl: string
): MediaType {
  if (dbMediaType === "pdf") return "pdf"
  if (dbMediaType === "image") return "image"
  return getMediaTypeFromUrl(imageUrl)
}
