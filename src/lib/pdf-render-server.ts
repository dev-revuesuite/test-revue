import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  getPdfAnalysisMaxHeightPx,
  getPdfAnalysisMaxWidthPx,
  getPdfAnalysisMinWidthPx,
  getPdfAnalysisRenderScale,
} from "@/lib/inference-config"
import { ensurePdfServerPolyfills } from "@/lib/pdf-server-polyfills"

export interface RenderedPdfPage {
  imageBuffer: Buffer
  mimeType: "image/jpeg"
  width: number
  height: number
  pageNumber: number
  scale: number
}

type PdfJsServerModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs")

let pdfJsServerPromise: Promise<PdfJsServerModule> | null = null

function getPdfJsResourceUrl(...segments: string[]): string {
  const dirPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    ...segments
  )
  const url = pathToFileURL(dirPath).href
  return url.endsWith("/") ? url : `${url}/`
}

function getPdfDocumentInitOptions(data: Uint8Array) {
  return {
    data,
    standardFontDataUrl: getPdfJsResourceUrl("standard_fonts"),
    cMapUrl: getPdfJsResourceUrl("cmaps"),
    wasmUrl: getPdfJsResourceUrl("wasm"),
    cMapPacked: true,
    disableFontFace: false,
    useSystemFonts: true,
  }
}

async function loadPdfJsForServer(): Promise<PdfJsServerModule> {
  if (!pdfJsServerPromise) {
    pdfJsServerPromise = (async () => {
      await ensurePdfServerPolyfills()

      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
      const workerPath = path.join(
        process.cwd(),
        "node_modules",
        "pdfjs-dist",
        "legacy",
        "build",
        "pdf.worker.mjs"
      )
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
      return pdfjs
    })()
  }

  return pdfJsServerPromise
}

function resolveAnalysisScale(
  baseViewportWidth: number,
  baseViewportHeight: number,
  configuredScale: number
): number {
  const minScale = getPdfAnalysisMinWidthPx() / baseViewportWidth
  let scale = Math.max(configuredScale, minScale)

  const maxScale = Math.min(
    getPdfAnalysisMaxWidthPx() / baseViewportWidth,
    getPdfAnalysisMaxHeightPx() / baseViewportHeight
  )

  if (Number.isFinite(maxScale) && maxScale > 0) {
    scale = Math.min(scale, maxScale)
  }

  return scale
}

export async function renderPdfPageForAnalysis(
  pdfBuffer: Buffer,
  pageNumber: number,
  configuredScale = getPdfAnalysisRenderScale()
): Promise<RenderedPdfPage> {
  const pdfjs = await loadPdfJsForServer()
  const { createCanvas } = await import("@napi-rs/canvas")
  const loadingTask = pdfjs.getDocument(
    getPdfDocumentInitOptions(new Uint8Array(pdfBuffer))
  )
  const pdf = await loadingTask.promise

  try {
    const safePage = Math.min(Math.max(1, pageNumber), pdf.numPages)
    const pdfPage = await pdf.getPage(safePage)
    const baseViewport = pdfPage.getViewport({ scale: 1 })
    const scale = resolveAnalysisScale(
      baseViewport.width,
      baseViewport.height,
      configuredScale
    )
    const viewport = pdfPage.getViewport({ scale })

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    )
    const context = canvas.getContext("2d")

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)

    const renderTask = pdfPage.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    })

    await renderTask.promise

    const imageBuffer = canvas.toBuffer("image/jpeg", 92)

    return {
      imageBuffer,
      mimeType: "image/jpeg",
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
      pageNumber: safePage,
      scale,
    }
  } finally {
    await pdf.destroy()
  }
}

/** @deprecated Use renderPdfPageForAnalysis */
export async function renderPdfPageToPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  scale = getPdfAnalysisRenderScale()
): Promise<RenderedPdfPage> {
  return renderPdfPageForAnalysis(pdfBuffer, pageNumber, scale)
}

export async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF (${response.status} ${response.statusText})`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
