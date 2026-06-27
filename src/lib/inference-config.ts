const DEFAULT_INFERENCE_TIMEOUT_MS = 180_000
const DEFAULT_PDF_ANALYSIS_RENDER_SCALE = 2
const DEFAULT_ANALYSIS_IMAGE_MIN_WIDTH_PX = 1600
const DEFAULT_ANALYSIS_IMAGE_MAX_WIDTH_PX = 2400
const DEFAULT_PDF_ANALYSIS_MIN_WIDTH_PX = 1500
const DEFAULT_PDF_ANALYSIS_MAX_WIDTH_PX = 2400
const DEFAULT_PDF_ANALYSIS_MAX_HEIGHT_PX = 3200
const MAX_INFERENCE_FILE_BYTES = 50 * 1024 * 1024

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "")
}

export function getInferenceApiBaseUrl(): string {
  const baseUrl = process.env.INFERENCE_API_BASE_URL?.trim()
  if (!baseUrl) {
    throw new Error("INFERENCE_API_BASE_URL is not configured")
  }
  return trimTrailingSlash(baseUrl)
}

export function getInferenceApiTimeoutMs(): number {
  const raw = process.env.INFERENCE_API_TIMEOUT_MS?.trim()
  if (!raw) return DEFAULT_INFERENCE_TIMEOUT_MS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_INFERENCE_TIMEOUT_MS
}

export function getPdfAnalysisRenderScale(): number {
  const raw = process.env.PDF_ANALYSIS_RENDER_SCALE?.trim()
  if (!raw) return DEFAULT_PDF_ANALYSIS_RENDER_SCALE
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_PDF_ANALYSIS_RENDER_SCALE
}

function readPositiveEnvInt(
  raw: string | undefined,
  fallback: number
): number {
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getAnalysisImageMinWidthPx(): number {
  return readPositiveEnvInt(
    process.env.ANALYSIS_IMAGE_MIN_WIDTH_PX?.trim(),
    DEFAULT_ANALYSIS_IMAGE_MIN_WIDTH_PX
  )
}

export function getAnalysisImageMaxWidthPx(): number {
  return readPositiveEnvInt(
    process.env.ANALYSIS_IMAGE_MAX_WIDTH_PX?.trim(),
    DEFAULT_ANALYSIS_IMAGE_MAX_WIDTH_PX
  )
}

export function getPdfAnalysisMinWidthPx(): number {
  return readPositiveEnvInt(
    process.env.PDF_ANALYSIS_MIN_WIDTH_PX?.trim(),
    DEFAULT_PDF_ANALYSIS_MIN_WIDTH_PX
  )
}

export function getPdfAnalysisMaxWidthPx(): number {
  return readPositiveEnvInt(
    process.env.PDF_ANALYSIS_MAX_WIDTH_PX?.trim(),
    DEFAULT_PDF_ANALYSIS_MAX_WIDTH_PX
  )
}

export function getClientCanvasAnalysisMinWidthPx(): number {
  return getAnalysisImageMinWidthPx()
}

export function getClientCanvasAnalysisMaxWidthPx(): number {
  return getAnalysisImageMaxWidthPx()
}

export function getPdfAnalysisMaxHeightPx(): number {
  return readPositiveEnvInt(
    process.env.PDF_ANALYSIS_MAX_HEIGHT_PX?.trim(),
    DEFAULT_PDF_ANALYSIS_MAX_HEIGHT_PX
  )
}

export function getMaxInferenceFileBytes(): number {
  return MAX_INFERENCE_FILE_BYTES
}

export function getSpikeTestImagePath(): string | null {
  const configured = process.env.SPIKE_TEST_IMAGE_PATH?.trim()
  return configured || null
}

export function getSpikeTestPdfUrl(): string {
  return (
    process.env.SPIKE_TEST_PDF_URL?.trim() ||
    "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
  )
}

export function assertInferenceDevSpikeEnabled(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AI spike endpoints are disabled in production")
  }
}
