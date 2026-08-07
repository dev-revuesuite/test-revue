import type { PDFDocumentProxy } from "pdfjs-dist"

import { apiPath } from "@/lib/base-path"

/** 1 MB range chunks — fewer round trips on large PDFs. */
const PDF_RANGE_CHUNK_SIZE = 1024 * 1024

export interface OpenPdfDocumentOptions {
  /** When set, load through the same-origin streaming proxy (Revue). */
  iterationId?: string | null
}

export function buildIterationPdfStreamUrl(iterationId: string): string {
  return apiPath(`/api/iterations/${iterationId}/pdf`)
}

function isInlineUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:")
}

function buildDocumentSource(
  url: string,
  options?: OpenPdfDocumentOptions
): {
  url: string
  withCredentials: boolean
  disableRange: boolean
  disableStream: boolean
  rangeChunkSize: number
  allowFullDownloadFallback: boolean
} {
  if (options?.iterationId) {
    return {
      url: buildIterationPdfStreamUrl(options.iterationId),
      withCredentials: true,
      disableRange: false,
      disableStream: false,
      rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
      allowFullDownloadFallback: false,
    }
  }

  if (isInlineUrl(url)) {
    return {
      url,
      withCredentials: false,
      disableRange: true,
      disableStream: true,
      rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
      allowFullDownloadFallback: false,
    }
  }

  return {
    url,
    withCredentials: false,
    disableRange: false,
    disableStream: false,
    rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
    allowFullDownloadFallback: true,
  }
}

/**
 * Open a PDF for PDF.js. Revue passes `iterationId` so the file is fetched through
 * our same-origin range proxy (partial downloads). Blob/data URLs skip the proxy.
 */
export async function openPdfDocument(
  pdfjs: typeof import("pdfjs-dist"),
  url: string,
  options?: OpenPdfDocumentOptions
): Promise<PDFDocumentProxy> {
  if (!url && !options?.iterationId) {
    throw new Error("No PDF URL provided")
  }

  const source = buildDocumentSource(url, options)

  try {
    const task = pdfjs.getDocument({
      url: source.url,
      withCredentials: source.withCredentials,
      disableRange: source.disableRange,
      disableStream: source.disableStream,
      rangeChunkSize: source.rangeChunkSize,
    })
    return await task.promise
  } catch (directErr) {
    if (!source.allowFullDownloadFallback) {
      throw directErr instanceof Error
        ? directErr
        : new Error("Failed to load PDF")
    }

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
