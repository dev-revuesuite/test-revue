import type { MediaType } from "@/lib/media-type"

/** Column labels configured in the project brief naming convention UI. */
export const NAMING_COLUMN_OPTIONS = [
  "Brand Name",
  "Project Name",
  "Date",
  "Version",
  "Client Name",
  "File Type",
  "Status",
] as const

export type NamingColumnOption = (typeof NAMING_COLUMN_OPTIONS)[number]

export interface CreativeNamingContext {
  brandName?: string
  clientName?: string
  projectName?: string
  /** Iteration upload date (ISO string or Date). */
  date?: string | Date
  version?: number
  mediaType?: MediaType
  /** Output extension without dot, e.g. "png" or "pdf". */
  fileExtension?: string
  status?: string
  creativeName?: string
}

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

export function formatNamingDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

/** Sanitize one naming segment (spaces become hyphens). */
export function sanitizeNamingSegment(value: string): string {
  const trimmed = value.trim().replace(ILLEGAL_FILENAME_CHARS, "")
  const normalized = trimmed
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized.slice(0, 80)
}

export function resolveNamingSegment(
  column: string,
  context: CreativeNamingContext
): string {
  switch (column) {
    case "Brand Name":
      return sanitizeNamingSegment(context.brandName || context.clientName || "")
    case "Client Name":
      return sanitizeNamingSegment(context.clientName || context.brandName || "")
    case "Project Name":
      return sanitizeNamingSegment(context.projectName || "")
    case "Date":
      return context.date ? formatNamingDate(context.date) : ""
    case "Version":
      return context.version != null && Number.isFinite(context.version)
        ? `v${context.version}`
        : ""
    case "File Type": {
      const ext = (context.fileExtension || "")
        .toLowerCase()
        .replace(/^\./, "")
      if (ext) return ext
      return context.mediaType === "pdf" ? "pdf" : "png"
    }
    case "Status":
      return sanitizeNamingSegment(context.status || "")
    default:
      return ""
  }
}

/**
 * Build a download filename from the project's naming convention.
 * Returns null when no convention is configured or every segment is empty.
 */
export function buildFilenameFromNamingConvention(
  namingColumns: string[] | null | undefined,
  context: CreativeNamingContext,
  extension: string
): string | null {
  const columns = (namingColumns || []).filter(Boolean)
  if (columns.length === 0) return null

  const segments = columns
    .map((column) => resolveNamingSegment(column, context))
    .filter(Boolean)

  if (segments.length === 0) return null

  const ext = extension.startsWith(".") ? extension : `.${extension}`
  return `${segments.join("_")}${ext}`
}
