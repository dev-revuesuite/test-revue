import type { SupabaseClient } from "@supabase/supabase-js"

import { isMissingDbFunctionError } from "@/lib/plans"

interface DueReservation {
  reservation_id: string
  bucket_id: string
  object_path: string
  status: string
  object_exists: boolean
  referenced: boolean
}

export interface StorageCleanupResult {
  dryRun: boolean
  checked: number
  /** Files kept because a saved record uses them; reservation marked completed. */
  kept: number
  /** Unconfirmed uploads deleted. */
  removed: number
  /** Reservations closed with no file to remove. */
  expired: number
  failed: { reservationId: string; error: string }[]
  /** True when the storage-limit migration isn't applied yet. */
  skipped?: boolean
}

/**
 * Closes reservations whose signed upload URL can no longer be used.
 * A file referenced by a saved record is never deleted. Safe to re-run.
 */
export async function runStorageReservationCleanup(
  admin: SupabaseClient,
  { dryRun = false }: { dryRun?: boolean } = {}
): Promise<StorageCleanupResult> {
  const result: StorageCleanupResult = {
    dryRun,
    checked: 0,
    kept: 0,
    removed: 0,
    expired: 0,
    failed: [],
  }

  const { data, error } = await admin.rpc("storage_reservations_due_for_cleanup", {
    p_limit: 500,
  })

  if (error) {
    if (isMissingDbFunctionError(error)) {
      return { ...result, skipped: true }
    }
    throw new Error(`Failed to load storage reservations: ${error.message}`)
  }

  const due = (data ?? []) as DueReservation[]
  result.checked = due.length

  for (const reservation of due) {
    const id = reservation.reservation_id

    if (reservation.referenced) {
      result.kept += 1
      if (!dryRun) await finish(admin, id, "completed", result)
      continue
    }

    if (!reservation.object_exists) {
      result.expired += 1
      if (!dryRun) await finish(admin, id, "expired", result)
      continue
    }

    result.removed += 1
    if (dryRun) continue

    const { error: removeError } = await admin.storage
      .from(reservation.bucket_id)
      .remove([reservation.object_path])

    if (removeError) {
      // Left open; the next run retries.
      result.removed -= 1
      result.failed.push({ reservationId: id, error: removeError.message })
      continue
    }

    await finish(admin, id, "expired", result)
  }

  return result
}

async function finish(
  admin: SupabaseClient,
  reservationId: string,
  status: "completed" | "expired",
  result: StorageCleanupResult
) {
  const { error } = await admin.rpc("finish_storage_reservation", {
    p_reservation_id: reservationId,
    p_status: status,
  })
  if (error) {
    result.failed.push({ reservationId, error: error.message })
  }
}
