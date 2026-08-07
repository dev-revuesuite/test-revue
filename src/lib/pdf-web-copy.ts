/**
 * Web-optimized PDF sibling of an uploaded original.
 * Original stays immutable; viewers may prefer `{name}.web.pdf` when present.
 */

/** Minimum output/input size ratio to accept a linearized web copy. */
export const PDF_WEB_COPY_MIN_SIZE_RATIO = 0.5

/**
 * `project/file.pdf` → `project/file.web.pdf`
 * Already a `.web.pdf` path is returned unchanged.
 */
export function toWebPdfStoragePath(storagePath: string): string {
  const normalized = storagePath.trim()
  const lower = normalized.toLowerCase()

  if (lower.endsWith(".web.pdf")) {
    return normalized
  }

  if (!lower.endsWith(".pdf")) {
    throw new Error("Not a PDF storage path")
  }

  return `${normalized.slice(0, -4)}.web.pdf`
}

/**
 * Public/signed storage URL for `file.pdf` → same URL with `file.web.pdf`.
 * Returns null when the URL is not a `.pdf` object path.
 */
export function toWebPdfPublicUrl(originalUrl: string): string | null {
  try {
    const url = new URL(originalUrl)
    const lower = url.pathname.toLowerCase()

    if (lower.endsWith(".web.pdf")) {
      return originalUrl
    }

    if (!lower.endsWith(".pdf")) {
      return null
    }

    url.pathname = `${url.pathname.slice(0, -4)}.web.pdf`
    return url.href
  } catch {
    return null
  }
}

export function isAcceptableWebPdfSize(
  inputBytes: number,
  outputBytes: number,
  minRatio = PDF_WEB_COPY_MIN_SIZE_RATIO
): boolean {
  if (inputBytes <= 0 || outputBytes <= 0) return false
  return outputBytes >= inputBytes * minRatio
}
