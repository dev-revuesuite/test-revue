let workerConfigured = false

/** Call once before getDocument (client only). */
export function configurePdfWorker(
  pdfjs: typeof import("pdfjs-dist")
): void {
  if (typeof window === "undefined") return
  if (workerConfigured) return

  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  workerConfigured = true
}

export async function loadPdfJs(): Promise<typeof import("pdfjs-dist")> {
  const pdfjs = await import("pdfjs-dist")
  configurePdfWorker(pdfjs)
  return pdfjs
}
