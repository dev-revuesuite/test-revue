import type { AISuggestion } from "@/components/communication/comments-panel"
import type { CreativeNamingContext } from "@/lib/creative-naming-convention"
import type { MediaType } from "@/lib/media-type"
import { buildCreativeDownloadFilename } from "@/lib/download-creative-client"

function severityColors(
  severity: AISuggestion["severity"]
): { stroke: string; fill: string } {
  switch (severity) {
    case "error":
      return { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.25)" }
    case "warning":
      return { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.25)" }
    default:
      return { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.25)" }
  }
}

function drawAiBboxesOnCanvas(
  ctx: CanvasRenderingContext2D,
  suggestions: AISuggestion[],
  canvasWidth: number,
  canvasHeight: number
): void {
  const lineWidth = Math.max(
    2,
    Math.round(Math.min(canvasWidth, canvasHeight) / 400)
  )

  for (const suggestion of suggestions) {
    if (!suggestion.bbox || !suggestion.imageWidth || !suggestion.imageHeight) {
      continue
    }

    const scaleX = canvasWidth / suggestion.imageWidth
    const scaleY = canvasHeight / suggestion.imageHeight
    const x = suggestion.bbox.x1 * scaleX
    const y = suggestion.bbox.y1 * scaleY
    const width = (suggestion.bbox.x2 - suggestion.bbox.x1) * scaleX
    const height = (suggestion.bbox.y2 - suggestion.bbox.y1) * scaleY
    const colors = severityColors(suggestion.severity)

    ctx.fillStyle = colors.fill
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = colors.stroke
    ctx.lineWidth = lineWidth
    ctx.strokeRect(
      x + lineWidth / 2,
      y + lineWidth / 2,
      Math.max(0, width - lineWidth),
      Math.max(0, height - lineWidth)
    )
  }
}

async function loadImageUrlToCanvas(imageUrl: string): Promise<HTMLCanvasElement> {
  const response = await fetch(imageUrl, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const blob = await response.blob()
  if (blob.size === 0) {
    throw new Error("Downloaded file is empty")
  }

  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("Failed to prepare export canvas")
  }

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas
}

function copyPdfCanvasFromDom(): HTMLCanvasElement {
  const container = document.querySelector('[data-creative-media-root="primary"]')
  const pdfCanvas = container?.querySelector("canvas")
  if (!pdfCanvas || pdfCanvas.width <= 0 || pdfCanvas.height <= 0) {
    throw new Error("Wait for the PDF page to finish loading")
  }

  const output = document.createElement("canvas")
  output.width = pdfCanvas.width
  output.height = pdfCanvas.height

  const ctx = output.getContext("2d")
  if (!ctx) {
    throw new Error("Failed to prepare export canvas")
  }

  ctx.drawImage(pdfCanvas, 0, 0)
  return output
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

export function filterExportableAiSuggestions(
  suggestions: AISuggestion[]
): AISuggestion[] {
  return suggestions.filter(
    (suggestion) =>
      suggestion.bbox &&
      suggestion.imageWidth &&
      suggestion.imageHeight &&
      suggestion.imageWidth > 0 &&
      suggestion.imageHeight > 0
  )
}

export async function downloadCreativeWithAiBoxesInBrowser(options: {
  imageUrl: string
  mediaType: MediaType
  creativeName?: string
  version?: number
  currentPage?: number
  aiSuggestions: AISuggestion[]
  namingColumns?: string[] | null
  namingContext?: Omit<
    CreativeNamingContext,
    "version" | "mediaType" | "creativeName" | "fileExtension"
  >
}): Promise<void> {
  const {
    imageUrl,
    mediaType,
    creativeName,
    version,
    currentPage = 1,
    aiSuggestions,
    namingColumns,
    namingContext,
  } = options

  if (!imageUrl.trim()) {
    throw new Error("No file to download")
  }

  const exportableSuggestions = filterExportableAiSuggestions(aiSuggestions)
  if (exportableSuggestions.length === 0) {
    throw new Error("No AI boxes available to export")
  }

  const canvas =
    mediaType === "pdf"
      ? copyPdfCanvasFromDom()
      : await loadImageUrlToCanvas(imageUrl)

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Failed to prepare export canvas")
  }

  drawAiBboxesOnCanvas(
    ctx,
    exportableSuggestions,
    canvas.width,
    canvas.height
  )

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png")
  })
  if (!blob) {
    throw new Error("Failed to export image with AI boxes")
  }

  const baseName = buildCreativeDownloadFilename(imageUrl, {
    creativeName,
    version,
    mediaType: "image",
    namingColumns,
    namingContext,
  }).replace(/\.[^.]+$/, "")

  const pageSuffix = mediaType === "pdf" ? `-page-${currentPage}` : ""
  const filename = `${baseName}${pageSuffix}-with-ai-boxes.png`

  triggerBrowserDownload(blob, filename)
}
