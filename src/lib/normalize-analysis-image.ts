import { createCanvas, loadImage } from "@napi-rs/canvas"

import {
  getAnalysisImageMaxWidthPx,
  getAnalysisImageMinWidthPx,
} from "@/lib/inference-config"

const INFERENCE_JPEG_QUALITY = 95

export interface NormalizableAnalysisImage {
  buffer: Buffer
  mimeType: string
  filename: string
}

export interface NormalizedAnalysisImage {
  buffer: Buffer
  mimeType: string
  filename: string
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
  resized: boolean
}

function resolveTargetDimensions(
  sourceWidth: number,
  sourceHeight: number
): { targetWidth: number; targetHeight: number } {
  const minWidth = getAnalysisImageMinWidthPx()
  const maxWidth = getAnalysisImageMaxWidthPx()

  let targetWidth = sourceWidth
  let targetHeight = sourceHeight

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

  return { targetWidth, targetHeight }
}

function inferenceFilename(originalFilename: string): string {
  const base = originalFilename.replace(/\.[^.]+$/, "") || "creative"
  return `${base}-analysis.jpg`
}

export async function normalizeAnalysisImageForInference(
  input: NormalizableAnalysisImage
): Promise<NormalizedAnalysisImage> {
  const image = await loadImage(input.buffer)
  const sourceWidth = image.width
  const sourceHeight = image.height
  const { targetWidth, targetHeight } = resolveTargetDimensions(
    sourceWidth,
    sourceHeight
  )

  if (targetWidth === sourceWidth && targetHeight === sourceHeight) {
    return {
      buffer: input.buffer,
      mimeType: input.mimeType,
      filename: input.filename,
      width: sourceWidth,
      height: sourceHeight,
      sourceWidth,
      sourceHeight,
      resized: false,
    }
  }

  const canvas = createCanvas(targetWidth, targetHeight)
  const context = canvas.getContext("2d")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, targetWidth, targetHeight)
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  return {
    buffer: canvas.toBuffer("image/jpeg", INFERENCE_JPEG_QUALITY),
    mimeType: "image/jpeg",
    filename: inferenceFilename(input.filename),
    width: targetWidth,
    height: targetHeight,
    sourceWidth,
    sourceHeight,
    resized: true,
  }
}

export function resolveAnalysisTargetDimensions(
  sourceWidth: number,
  sourceHeight: number
): { targetWidth: number; targetHeight: number } {
  return resolveTargetDimensions(sourceWidth, sourceHeight)
}
