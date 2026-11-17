/** Shared between the storage upload API routes and the browser helper. */

export const STORAGE_UPLOAD_CATEGORIES = [
  "design",
  "version",
  "quick",
  "brand",
  "font",
  "ref",
  "client_logo",
  "org_logo",
] as const

export type StorageUploadCategory = (typeof STORAGE_UPLOAD_CATEGORIES)[number]

export interface StorageUploadTarget {
  /** design */
  projectId?: string
  /** version */
  creativeId?: string
  /** version: id of the iteration being created (used as its folder) */
  iterationId?: string
  /** quick, brand, font, ref, client_logo, org_logo */
  organizationId?: string
  /** quick: id of the quick analysis being created (used as its folder) */
  quickAnalysisId?: string
  /** ref */
  clientId?: string
}

export interface StorageUploadRequest {
  category: StorageUploadCategory
  fileName: string
  size: number
  contentType?: string
  target: StorageUploadTarget
}

export type StorageUploadGrant =
  | {
      mode: "signed"
      reservationId: string
      bucket: string
      path: string
      token: string
      signedUrl: string
      publicUrl: string
    }
  | {
      /** Storage limits aren't deployed yet: upload directly, as before. */
      mode: "direct"
      bucket: string
      path: string
      publicUrl: string
    }

export const STORAGE_LIMIT_REACHED_CODE = "STORAGE_LIMIT_REACHED"
export const STORAGE_NOT_CONFIGURED_CODE = "STORAGE_NOT_CONFIGURED"
export const LOGO_TOO_LARGE_CODE = "LOGO_TOO_LARGE"

export interface StorageUploadErrorBody {
  error: string
  code?: string
}
