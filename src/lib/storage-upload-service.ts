import type { SupabaseClient } from "@supabase/supabase-js"

import { formatStorageBytes, isMissingDbFunctionError, TRIAL_EXPIRED_CODE, TRIAL_EXPIRED_MESSAGE } from "@/lib/plans"
import { checkStoragePathAccess } from "@/lib/storage-path-access"
import {
  LOGO_TOO_LARGE_CODE,
  STORAGE_LIMIT_REACHED_CODE,
  STORAGE_NOT_CONFIGURED_CODE,
  STORAGE_UPLOAD_CATEGORIES,
  type StorageUploadCategory,
  type StorageUploadGrant,
  type StorageUploadRequest,
} from "@/lib/storage-upload-types"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Used only if a signed token's expiry can't be read: hold space for a full day. */
const FALLBACK_URL_LIFETIME_MS = 24 * 60 * 60 * 1000

export class StorageUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = "StorageUploadError"
  }
}

const BUCKET_BY_CATEGORY: Record<StorageUploadCategory, string> = {
  design: "creatives",
  version: "revue-assets",
  quick: "quick-analysis-assets",
  brand: "client-assets",
  font: "client-assets",
  ref: "client-assets",
  client_logo: "client-assets",
  org_logo: "client-assets",
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return cleaned.slice(-120) || "file"
}

function fileExtension(name: string, fallback: string): string {
  const ext = (name.split(".").pop() || "").replace(/[^A-Za-z0-9]+/g, "").toLowerCase()
  return ext && ext !== name.toLowerCase() ? ext.slice(0, 10) : fallback
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

function requireUuid(value: unknown, field: string): string {
  if (!isUuid(value)) {
    throw new StorageUploadError(`${field} is required`, 400)
  }
  return value
}

/** Reads `exp` from the signed upload token (a JWT) without verifying it. */
function tokenExpiry(token: string): Date {
  try {
    const payload = token.split(".")[1]
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as { exp?: number }
    if (typeof json.exp === "number" && Number.isFinite(json.exp)) {
      return new Date(json.exp * 1000)
    }
  } catch {
    // fall through
  }
  return new Date(Date.now() + FALLBACK_URL_LIFETIME_MS)
}

interface ResolvedUpload {
  bucket: string
  path: string
  /** null only for a logo of an organization that doesn't exist yet */
  organizationId: string | null
}

/** Builds the object path on the server and finds the owning organization. */
async function resolveUpload(
  admin: SupabaseClient,
  userId: string,
  request: StorageUploadRequest
): Promise<ResolvedUpload> {
  const { category, fileName, target } = request
  const bucket = BUCKET_BY_CATEGORY[category]
  const stamp = Date.now()

  switch (category) {
    case "design": {
      const projectId = requireUuid(target.projectId, "projectId")
      const { data } = await admin
        .from("projects")
        .select("id, clients!inner(organization_id)")
        .eq("id", projectId)
        .maybeSingle()
      const client = data?.clients as { organization_id: string } | { organization_id: string }[] | undefined
      const organizationId = Array.isArray(client) ? client[0]?.organization_id : client?.organization_id
      if (!organizationId) throw new StorageUploadError("Project not found", 404)
      return {
        bucket,
        path: `${projectId}/${stamp}-${randomSuffix()}-${safeFileName(fileName)}`,
        organizationId,
      }
    }
    case "version": {
      const creativeId = requireUuid(target.creativeId, "creativeId")
      const iterationId = requireUuid(target.iterationId, "iterationId")
      const { data } = await admin
        .from("creatives")
        .select("id, projects!inner(clients!inner(organization_id))")
        .eq("id", creativeId)
        .maybeSingle()
      const project = data?.projects as
        | { clients: { organization_id: string } | { organization_id: string }[] }
        | { clients: { organization_id: string } | { organization_id: string }[] }[]
        | undefined
      const projectRow = Array.isArray(project) ? project[0] : project
      const clientRow = Array.isArray(projectRow?.clients) ? projectRow?.clients[0] : projectRow?.clients
      const organizationId = clientRow?.organization_id
      if (!organizationId) throw new StorageUploadError("Creative not found", 404)
      return {
        bucket,
        path: `iterations/${creativeId}/${iterationId}/${safeFileName(fileName)}`,
        organizationId,
      }
    }
    case "quick": {
      const organizationId = requireUuid(target.organizationId, "organizationId")
      const quickAnalysisId = requireUuid(target.quickAnalysisId, "quickAnalysisId")
      return {
        bucket,
        path: `${organizationId}/${quickAnalysisId}/${safeFileName(fileName)}`,
        organizationId,
      }
    }
    case "brand": {
      const organizationId = requireUuid(target.organizationId, "organizationId")
      return {
        bucket,
        path: `${organizationId}/${stamp}-${randomSuffix()}.${fileExtension(fileName, "png")}`,
        organizationId,
      }
    }
    case "font": {
      const organizationId = requireUuid(target.organizationId, "organizationId")
      return {
        bucket,
        path: `${organizationId}/${stamp}-${randomSuffix()}-${safeFileName(fileName)}`,
        organizationId,
      }
    }
    case "ref": {
      const organizationId = requireUuid(target.organizationId, "organizationId")
      const clientId = requireUuid(target.clientId, "clientId")
      return {
        bucket,
        path: `${organizationId}/${clientId}/refs/${stamp}-${randomSuffix()}-${safeFileName(fileName)}`,
        organizationId,
      }
    }
    case "client_logo": {
      const organizationId = requireUuid(target.organizationId, "organizationId")
      return {
        bucket,
        path: `${organizationId}/${stamp}-logo.${fileExtension(fileName, "png")}`,
        organizationId,
      }
    }
    case "org_logo": {
      // Without an organization id: the new-organization dialog, before the
      // organization exists. The folder is then the user's own id.
      if (target.organizationId) {
        const organizationId = requireUuid(target.organizationId, "organizationId")
        return {
          bucket,
          path: `org-logos/${organizationId}/${stamp}-logo.${fileExtension(fileName, "png")}`,
          organizationId,
        }
      }
      return {
        bucket,
        path: `org-logos/${userId}/${stamp}-logo.${fileExtension(fileName, "png")}`,
        organizationId: null,
      }
    }
  }
}

async function assertMayWrite(
  supabase: SupabaseClient,
  resolved: ResolvedUpload
): Promise<"allowed" | "unavailable"> {
  if (resolved.bucket === "quick-analysis-assets") {
    // Same rule as the bucket's existing storage policy.
    const { data, error } = await supabase.rpc("user_is_org_team_member", {
      p_organization_id: resolved.organizationId,
    })
    if (error || data !== true) {
      throw new StorageUploadError("You don't have permission to upload here", 403)
    }
    return "allowed"
  }

  const access = await checkStoragePathAccess(supabase, resolved.bucket, resolved.path)
  if (access === "denied") {
    throw new StorageUploadError("You don't have permission to upload here", 403)
  }
  return access
}

function limitMessage(code: string | undefined, result: Record<string, unknown>): string {
  if (code === STORAGE_LIMIT_REACHED_CODE) {
    const used = Number(result.used_bytes ?? 0)
    const limit = Number(result.limit_bytes ?? 0)
    return `Storage full: ${formatStorageBytes(used)} of ${formatStorageBytes(limit)} used. Delete old files or upgrade your plan.`
  }
  if (code === STORAGE_NOT_CONFIGURED_CODE) {
    return "Storage isn't set up for your plan yet. Contact support."
  }
  if (code === LOGO_TOO_LARGE_CODE) {
    return "Logos can be up to 5 MB. Choose a smaller file."
  }
  if (code === TRIAL_EXPIRED_CODE) {
    return TRIAL_EXPIRED_MESSAGE
  }
  return "Upload isn't allowed right now."
}

/**
 * Authorizes an upload, reserves storage and returns a signed upload URL.
 * Falls back to a direct upload when the storage-limit functions aren't
 * deployed yet.
 */
export async function createStorageUpload(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  request: StorageUploadRequest
): Promise<StorageUploadGrant> {
  if (!STORAGE_UPLOAD_CATEGORIES.includes(request.category)) {
    throw new StorageUploadError("Invalid upload category", 400)
  }
  if (!Number.isSafeInteger(request.size) || request.size <= 0) {
    throw new StorageUploadError("Invalid file size", 400)
  }
  if (typeof request.fileName !== "string" || !request.fileName.trim()) {
    throw new StorageUploadError("fileName is required", 400)
  }

  const resolved = await resolveUpload(admin, userId, request)
  const access = await assertMayWrite(supabase, resolved)
  const publicUrl = admin.storage.from(resolved.bucket).getPublicUrl(resolved.path).data.publicUrl

  if (access === "unavailable") {
    return { mode: "direct", bucket: resolved.bucket, path: resolved.path, publicUrl }
  }

  const { data: reserved, error: reserveError } = await admin.rpc("reserve_storage_upload", {
    p_organization_id: resolved.organizationId,
    p_user_id: userId,
    p_bucket: resolved.bucket,
    p_path: resolved.path,
    p_category: request.category,
    p_bytes: request.size,
  })

  if (reserveError) {
    if (isMissingDbFunctionError(reserveError)) {
      return { mode: "direct", bucket: resolved.bucket, path: resolved.path, publicUrl }
    }
    console.error("[storage-upload] Reserve failed", { error: reserveError.message })
    throw new StorageUploadError("Couldn't start the upload. Please try again.", 500)
  }

  const result = (reserved ?? {}) as Record<string, unknown>
  if (result.ok !== true) {
    const code = typeof result.code === "string" ? result.code : undefined
    const status =
      code === LOGO_TOO_LARGE_CODE
        ? 413
        : code === STORAGE_LIMIT_REACHED_CODE ||
            code === STORAGE_NOT_CONFIGURED_CODE ||
            code === TRIAL_EXPIRED_CODE
          ? 402
          : 400
    throw new StorageUploadError(limitMessage(code, result), status, code)
  }

  const reservationId = String(result.reservation_id)

  const { data: signed, error: signError } = await admin.storage
    .from(resolved.bucket)
    .createSignedUploadUrl(resolved.path)

  if (signError || !signed) {
    // No URL was issued, so nothing can upload: release immediately.
    await admin.rpc("cancel_storage_upload", {
      p_reservation_id: reservationId,
      p_user_id: userId,
      p_url_issued: false,
    })
    console.error("[storage-upload] Signing failed", { error: signError?.message })
    throw new StorageUploadError("Couldn't start the upload. Please try again.", 500)
  }

  const { error: expiryError } = await admin.rpc("set_storage_reservation_expiry", {
    p_reservation_id: reservationId,
    p_url_expires_at: tokenExpiry(signed.token).toISOString(),
  })
  if (expiryError) {
    // The reservation keeps its conservative placeholder expiry; still safe.
    console.error("[storage-upload] Saving URL expiry failed", { error: expiryError.message })
  }

  return {
    mode: "signed",
    reservationId,
    bucket: resolved.bucket,
    path: resolved.path,
    token: signed.token,
    signedUrl: signed.signedUrl,
    publicUrl,
  }
}

async function removeObject(admin: SupabaseClient, bucket: string, path: string): Promise<boolean> {
  const { error } = await admin.storage.from(bucket).remove([path])
  if (error) {
    console.error("[storage-upload] File removal failed", { bucket, path, error: error.message })
    return false
  }
  return true
}

export async function completeStorageUpload(
  admin: SupabaseClient,
  userId: string,
  reservationId: string
): Promise<void> {
  const { data, error } = await admin.rpc("complete_storage_upload", {
    p_reservation_id: reservationId,
    p_user_id: userId,
  })
  if (error) {
    throw new StorageUploadError("Couldn't confirm the upload. Please try again.", 500)
  }

  const result = (data ?? {}) as Record<string, unknown>
  if (result.ok === true) return

  if (result.code === "SIZE_MISMATCH" && typeof result.bucket === "string" && typeof result.path === "string") {
    await removeObject(admin, result.bucket, result.path)
    throw new StorageUploadError("The uploaded file doesn't match its declared size.", 409, "SIZE_MISMATCH")
  }
  if (result.code === "NOT_FOUND") {
    throw new StorageUploadError("Upload not found", 404)
  }
  if (result.code === "NOT_UPLOADED") {
    throw new StorageUploadError("The file wasn't uploaded. Please try again.", 409, "NOT_UPLOADED")
  }
  throw new StorageUploadError("Couldn't confirm the upload. Please try again.", 409)
}

export async function cancelStorageUpload(
  admin: SupabaseClient,
  userId: string,
  reservationId: string
): Promise<void> {
  const { data, error } = await admin.rpc("cancel_storage_upload", {
    p_reservation_id: reservationId,
    p_user_id: userId,
    p_url_issued: true,
  })
  if (error) throw new StorageUploadError("Couldn't cancel the upload.", 500)
  if ((data as Record<string, unknown> | null)?.ok !== true) {
    throw new StorageUploadError("Upload not found", 404)
  }
}

/** Deletes an uploaded file whose database record couldn't be saved. Safe to retry. */
export async function discardStorageUpload(
  admin: SupabaseClient,
  userId: string,
  reservationId: string
): Promise<void> {
  const { data, error } = await admin.rpc("discard_storage_upload", {
    p_reservation_id: reservationId,
    p_user_id: userId,
  })
  if (error) throw new StorageUploadError("Couldn't remove the upload.", 500)

  const result = (data ?? {}) as Record<string, unknown>
  if (result.ok !== true) throw new StorageUploadError("Upload not found", 404)

  if (typeof result.bucket === "string" && typeof result.path === "string") {
    const removed = await removeObject(admin, result.bucket, result.path)
    if (!removed) {
      // The reservation is marked discarded; the daily cleanup retries.
      throw new StorageUploadError("Couldn't remove the upload. It will be cleaned up later.", 502)
    }
  }
}
