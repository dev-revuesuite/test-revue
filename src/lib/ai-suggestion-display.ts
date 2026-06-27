import type { ParsedInferenceBBox } from "@/lib/inference-response-parser"

export interface BboxPercentRect {
  left: number
  top: number
  width: number
  height: number
}

export function bboxToPercentRect(
  bbox: ParsedInferenceBBox,
  imageWidth: number,
  imageHeight: number
): BboxPercentRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Image dimensions must be greater than zero")
  }

  const left = (bbox.x1 / imageWidth) * 100
  const top = (bbox.y1 / imageHeight) * 100
  const width = ((bbox.x2 - bbox.x1) / imageWidth) * 100
  const height = ((bbox.y2 - bbox.y1) / imageHeight) * 100

  return { left, top, width, height }
}
