export class CreativeFileUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CreativeFileUploadError"
  }
}

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function estimateUploadTimeRemaining(
  loadedRatio: number,
  elapsedMs: number
): string | null {
  if (loadedRatio <= 0 || loadedRatio >= 1 || elapsedMs < 1000) return null

  const remainingMs = (elapsedMs / loadedRatio) * (1 - loadedRatio)
  const remainingMinutes = Math.ceil(remainingMs / 60000)

  if (remainingMinutes <= 1) return "< 1m left"
  return `${remainingMinutes}m left`
}
