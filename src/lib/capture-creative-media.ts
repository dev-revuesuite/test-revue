import type { ClientAnalysisImageInput } from "@/lib/ai-analysis-client-image"
import {
  getAnalysisImageMaxWidthPx,
  getAnalysisImageMinWidthPx,
} from "@/lib/inference-config"

export type CreativeMediaCaptureRoot = "primary" | "compare"

export type CaptureCreativeMediaResult =
  | { ok: true; capture: ClientAnalysisImageInput }
  | { ok: false; error: string }

function canvasToJpegBase64(
  canvas: HTMLCanvasElement,
  quality = 0.95
): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null)
          return
        }

        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result !== "string") {
            resolve(null)
            return
          }

          const commaIndex = result.indexOf(",")
          resolve(commaIndex === -1 ? null : result.slice(commaIndex + 1))
        }
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      },
      "image/jpeg",
      quality
    )
  })
}

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * PDF.js renders to the on-screen canvas at preview width (~500px CSS).
 * EC2 OCR needs a higher-resolution image (similar to a screenshot or ~1600px file).
 */
function prepareAnalysisCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const minWidth = getAnalysisImageMinWidthPx()
  const maxWidth = getAnalysisImageMaxWidthPx()

  let targetWidth = source.width
  let targetHeight = source.height

  if (targetWidth < minWidth) {
    const scale = minWidth / targetWidth
    targetWidth = Math.round(targetWidth * scale)
    targetHeight = Math.round(targetHeight * scale)
  }

  if (targetWidth > maxWidth) {
    const scale = maxWidth / targetWidth
    targetWidth = Math.round(targetWidth * scale)
    targetHeight = Math.round(targetHeight * scale)
  }

  if (targetWidth === source.width && targetHeight === source.height) {
    return source
  }

  const output = document.createElement("canvas")
  output.width = targetWidth
  output.height = targetHeight

  const context = output.getContext("2d")
  if (!context) {
    throw new Error("Could not create analysis canvas")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, targetWidth, targetHeight)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(source, 0, 0, targetWidth, targetHeight)

  return output
}

/**
 * Capture the browser-rendered PDF canvas for AI analysis.
 * Upscales preview canvas to OCR-friendly resolution before export.
 */
export async function captureCreativeMediaForAnalysis(
  root: CreativeMediaCaptureRoot = "primary",
  expectedPageNumber?: number
): Promise<CaptureCreativeMediaResult> {
  if (typeof document === "undefined") {
    return { ok: false, error: "Canvas capture is only available in the browser" }
  }

  const container = document.querySelector(
    `[data-creative-media-root="${root}"]`
  )
  if (!container) {
    return { ok: false, error: "Could not find the creative preview area" }
  }

  const mediaRoot = container.querySelector("[data-creative-media]")
  const readyState = mediaRoot?.getAttribute("data-creative-media-ready")
  if (readyState === "false") {
    return {
      ok: false,
      error: "Wait for the PDF page to finish loading before running AI analysis",
    }
  }

  if (expectedPageNumber != null) {
    const renderedPage = parsePositiveInt(
      mediaRoot?.getAttribute("data-creative-media-page")
    )
    if (renderedPage != null && renderedPage !== expectedPageNumber) {
      return {
        ok: false,
        error: "The PDF page is still updating. Try again in a moment",
      }
    }
  }

  const canvas = container.querySelector("canvas")
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    return {
      ok: false,
      error: "Wait for the PDF page to finish loading before running AI analysis",
    }
  }

  try {
    const analysisCanvas = prepareAnalysisCanvas(canvas)
    const base64 = await canvasToJpegBase64(analysisCanvas)
    if (!base64) {
      return { ok: false, error: "Failed to capture the PDF page image" }
    }

    return {
      ok: true,
      capture: {
        data: base64,
        mimeType: "image/jpeg",
        width: analysisCanvas.width,
        height: analysisCanvas.height,
      },
    }
  } catch {
    return { ok: false, error: "Failed to capture the PDF page image" }
  }
}

/**
 * Rasterize the visible creative (PDF page canvas or image) for AI analysis.
 * Targets the primary Revue pane by default (current iteration in normal or compare mode).
 */
export async function captureCreativeMediaSnapshot(
  root: CreativeMediaCaptureRoot = "primary"
): Promise<string | null> {
  if (typeof document === "undefined") return null

  const container = document.querySelector(
    `[data-creative-media-root="${root}"]`
  )
  if (!container) return null

  const canvas = container.querySelector("canvas")
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    try {
      return canvas.toDataURL("image/png")
    } catch {
      return null
    }
  }

  const img = container.querySelector(
    "img[data-creative-media-image]"
  ) as HTMLImageElement | null
  if (!img || !img.complete || img.naturalWidth === 0) {
    return null
  }

  try {
    const offscreen = document.createElement("canvas")
    offscreen.width = img.naturalWidth
    offscreen.height = img.naturalHeight
    const ctx = offscreen.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return offscreen.toDataURL("image/png")
  } catch {
    return null
  }
}
