import { apiPath } from "@/lib/base-path"

export type LinearizePdfBucket = "creatives" | "revue-assets"

export interface PdfLinearizationResult {
  linearized: boolean
  skipped: boolean
}

/**
 * Reorders a stored PDF for fast web view (linearized /Fast Web View).
 * Non-blocking for uploads: failures are logged and the original file is kept.
 */
export async function requestPdfLinearization(
  bucket: LinearizePdfBucket,
  storagePath: string,
  signal?: AbortSignal
): Promise<PdfLinearizationResult | null> {
  try {
    const response = await fetch(apiPath("/api/creatives/linearize-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, storagePath }),
      signal,
    })

    if (!response.ok) {
      console.warn("[linearize-pdf] request failed:", response.status)
      return null
    }

    return (await response.json()) as PdfLinearizationResult
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }

    console.warn("[linearize-pdf] request error:", error)
    return null
  }
}
