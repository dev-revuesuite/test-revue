import type { SupabaseClient } from "@supabase/supabase-js"

import { apiPath } from "@/lib/base-path"
import { CREATIVE_FILE_CACHE_CONTROL } from "@/lib/creative-storage"
import {
  isTrialExpiredDbError,
  TRIAL_EXPIRED_CODE,
  TRIAL_EXPIRED_MESSAGE,
} from "@/lib/plans"
import {
  LOGO_TOO_LARGE_CODE,
  STORAGE_LIMIT_REACHED_CODE,
  STORAGE_NOT_CONFIGURED_CODE,
  type StorageUploadCategory,
  type StorageUploadErrorBody,
  type StorageUploadGrant,
  type StorageUploadTarget,
} from "@/lib/storage-upload-types"

/** Window event the PlanLimitDialogHost listens for. */
export const PLAN_LIMIT_EVENT = "revue:plan-limit"

export interface PlanLimitEventDetail {
  code: string
  message: string
}

const PLAN_BLOCK_CODES = new Set([
  STORAGE_LIMIT_REACHED_CODE,
  STORAGE_NOT_CONFIGURED_CODE,
  LOGO_TOO_LARGE_CODE,
  TRIAL_EXPIRED_CODE,
])

/** The upload was refused by the plan; a dialog has already been shown. */
export class StorageUploadBlockedError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message)
    this.name = "StorageUploadBlockedError"
  }
}

export class StorageUploadFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorageUploadFailedError"
  }
}

export function isStorageUploadBlocked(error: unknown): error is StorageUploadBlockedError {
  return error instanceof StorageUploadBlockedError
}

export interface UploadWithQuotaInput {
  category: StorageUploadCategory
  file: File
  target: StorageUploadTarget
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface UploadWithQuotaResult {
  bucket: string
  path: string
  publicUrl: string
  /**
   * Call when the file's database record couldn't be saved: deletes the file.
   * Never throws; a failed removal is cleaned up later by the daily job.
   */
  discard: () => Promise<void>
}

function notifyPlanLimit(detail: PlanLimitEventDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<PlanLimitEventDetail>(PLAN_LIMIT_EVENT, { detail }))
}

/** Opens the "free trial has ended" dialog (e.g. before a blocked action starts). */
export function showTrialExpiredDialog(): void {
  notifyPlanLimit({ code: TRIAL_EXPIRED_CODE, message: TRIAL_EXPIRED_MESSAGE })
}

/**
 * For browser-side Supabase writes: if the database refused the write because
 * the free trial has ended, shows the plan dialog and returns true.
 */
export function reportTrialExpired(
  error: { hint?: string | null; code?: string | null } | null | undefined
): boolean {
  if (!isTrialExpiredDbError(error)) return false
  showTrialExpiredDialog()
  return true
}

async function postJson<T>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(apiPath(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { ok: response.ok, status: response.status, data: data as T }
}

function sendWithProgress(
  method: "PUT" | "POST",
  url: string,
  headers: Record<string, string>,
  body: XMLHttpRequestBodyInit,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"))
      return
    }

    const xhr = new XMLHttpRequest()
    const handleAbort = () => xhr.abort()
    signal?.addEventListener("abort", handleAbort, { once: true })
    const done = () => signal?.removeEventListener("abort", handleAbort)

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))))
    })
    xhr.addEventListener("load", () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new StorageUploadFailedError("Upload failed. Check your connection and try again."))
    })
    xhr.addEventListener("error", () => {
      done()
      reject(new StorageUploadFailedError("Upload failed. Check your connection and try again."))
    })
    xhr.addEventListener("abort", () => {
      done()
      reject(new DOMException("Upload cancelled", "AbortError"))
    })

    xhr.open(method, url)
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
    xhr.send(body)
  })
}

/** Direct upload with the user's session (storage limits not deployed yet). */
async function uploadDirect(
  supabase: SupabaseClient,
  grant: Extract<StorageUploadGrant, { mode: "direct" }>,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!session?.access_token || !baseUrl || !apiKey) {
    throw new StorageUploadFailedError("Please sign in and try again.")
  }

  const encodedPath = grant.path.split("/").map(encodeURIComponent).join("/")
  await sendWithProgress(
    "POST",
    `${baseUrl}/storage/v1/object/${grant.bucket}/${encodedPath}`,
    {
      Authorization: `Bearer ${session.access_token}`,
      apikey: apiKey,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
      "Cache-Control": `max-age=${CREATIVE_FILE_CACHE_CONTROL}`,
    },
    file,
    onProgress,
    signal
  )
}

/** Upload to the server-issued signed URL (same request shape as storage-js). */
async function uploadSigned(
  grant: Extract<StorageUploadGrant, { mode: "signed" }>,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  const form = new FormData()
  form.append("cacheControl", CREATIVE_FILE_CACHE_CONTROL)
  form.append("", file)
  await sendWithProgress(
    "PUT",
    grant.signedUrl,
    { "x-upsert": "false", ...(apiKey ? { apikey: apiKey } : {}) },
    form,
    onProgress,
    signal
  )
}

/**
 * Uploads a file through the app server so the plan's storage limit and
 * permissions are enforced. Throws StorageUploadBlockedError (after showing
 * the plan dialog) when the plan refuses the upload.
 */
export async function uploadWithQuota(
  supabase: SupabaseClient,
  input: UploadWithQuotaInput
): Promise<UploadWithQuotaResult> {
  const { category, file, target, onProgress, signal } = input

  const requested = await postJson<StorageUploadGrant | StorageUploadErrorBody>("/api/storage/uploads", {
    category,
    fileName: file.name,
    size: file.size,
    contentType: file.type,
    target,
  })

  if (!requested.ok) {
    const body = requested.data as StorageUploadErrorBody | null
    const message = body?.error || "Couldn't start the upload. Please try again."
    if (body?.code && PLAN_BLOCK_CODES.has(body.code)) {
      notifyPlanLimit({ code: body.code, message })
      throw new StorageUploadBlockedError(message, body.code)
    }
    throw new StorageUploadFailedError(message)
  }

  const grant = requested.data as StorageUploadGrant

  if (grant.mode === "direct") {
    await uploadDirect(supabase, grant, file, onProgress, signal)
    return {
      bucket: grant.bucket,
      path: grant.path,
      publicUrl: grant.publicUrl,
      discard: async () => {
        const { error } = await supabase.storage.from(grant.bucket).remove([grant.path])
        if (error) console.error("Failed to remove upload:", error.message)
      },
    }
  }

  try {
    await uploadSigned(grant, file, onProgress, signal)
  } catch (error) {
    void postJson(`/api/storage/uploads/${grant.reservationId}/cancel`)
    throw error
  }

  const completed = await postJson<StorageUploadErrorBody>(
    `/api/storage/uploads/${grant.reservationId}/complete`
  )
  if (!completed.ok) {
    // The file may be in storage but isn't confirmed: remove it and release the
    // reserved space now (best effort; the daily cleanup is the fallback).
    try {
      await postJson(`/api/storage/uploads/${grant.reservationId}/discard`)
    } catch {
      // Network error: leave it to the daily cleanup.
    }
    throw new StorageUploadFailedError(
      completed.data?.error || "Couldn't confirm the upload. Please try again."
    )
  }

  return {
    bucket: grant.bucket,
    path: grant.path,
    publicUrl: grant.publicUrl,
    discard: async () => {
      const result = await postJson<StorageUploadErrorBody>(
        `/api/storage/uploads/${grant.reservationId}/discard`
      )
      if (!result.ok) console.error("Failed to remove upload:", result.data?.error)
    },
  }
}
