import { loadPdfJs } from "@/lib/pdfjs-config"
import { openPdfDocument } from "@/lib/pdf-document-loader"

/** Read page count from a PDF URL (client only). */
export async function getPdfPageCountFromUrl(url: string): Promise<number | null> {
  if (typeof window === "undefined") return null
  try {
    const pdfjs = await loadPdfJs()
    const pdf = await openPdfDocument(pdfjs, url)
    const count = pdf.numPages
    void pdf.destroy()
    return count
  } catch (err) {
    console.error("Failed to read PDF page count:", err)
    return null
  }
}
