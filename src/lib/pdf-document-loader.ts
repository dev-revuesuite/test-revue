import type { PDFDocumentProxy } from "pdfjs-dist"

/**
 * Open a PDF for PDF.js. Tries direct URL first; falls back to fetch + ArrayBuffer
 * when the storage host blocks range/CORS requests (common with Supabase public URLs).
 */
export async function openPdfDocument(
  pdfjs: typeof import("pdfjs-dist"),
  url: string
): Promise<PDFDocumentProxy> {
  if (!url) {
    throw new Error("No PDF URL provided")
  }

  try {
    const task = pdfjs.getDocument({ url, withCredentials: false })
    return await task.promise
  } catch (directErr) {
    try {
      const response = await fetch(url, { mode: "cors", credentials: "omit" })
      if (!response.ok) {
        throw new Error(
          `Failed to fetch PDF (${response.status} ${response.statusText})`
        )
      }
      const data = await response.arrayBuffer()
      const task = pdfjs.getDocument({ data })
      return await task.promise
    } catch (fetchErr) {
      const directMsg =
        directErr instanceof Error ? directErr.message : "Direct load failed"
      const fetchMsg =
        fetchErr instanceof Error ? fetchErr.message : "Fetch load failed"
      throw new Error(`${directMsg}. ${fetchMsg}`)
    }
  }
}
