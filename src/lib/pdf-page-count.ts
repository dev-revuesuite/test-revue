import { loadPdfJs } from "@/lib/pdfjs-config"
import { openPdfDocument } from "@/lib/pdf-document-loader"

/**
 * Read page count from a PDF URL (client only).
 * Pass `iterationId` to read via the same-origin range proxy — PDF.js then
 * fetches only the header/xref chunks instead of the whole file, which keeps
 * this fast even for very large PDFs.
 */
export async function getPdfPageCountFromUrl(
  url: string,
  iterationId?: string | null
): Promise<number | null> {
  if (typeof window === "undefined") return null
  try {
    const pdfjs = await loadPdfJs()
    const pdf = await openPdfDocument(pdfjs, url, { iterationId })
    const count = pdf.numPages
    void pdf.destroy()
    return count
  } catch (err) {
    console.error("Failed to read PDF page count:", err)
    return null
  }
}
