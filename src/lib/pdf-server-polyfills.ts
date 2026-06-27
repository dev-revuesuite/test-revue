let polyfillsApplied = false

export async function ensurePdfServerPolyfills(): Promise<void> {
  if (polyfillsApplied) {
    return
  }

  const { DOMMatrix, Path2D, ImageData } = await import("@napi-rs/canvas")

  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix
  }

  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = Path2D as typeof globalThis.Path2D
  }

  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = ImageData as typeof globalThis.ImageData
  }

  polyfillsApplied = true
}
