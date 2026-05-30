export type CreativeMediaCaptureRoot = "primary" | "compare"

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
