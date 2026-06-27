import { imageSize } from "image-size"

export function getImageDimensionsFromBuffer(
  imageBuffer: Buffer
): { width: number; height: number } {
  const dimensions = imageSize(imageBuffer)
  if (!dimensions.width || !dimensions.height) {
    throw new Error("Could not determine image dimensions")
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
  }
}
