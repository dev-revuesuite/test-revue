import type { SupabaseClient } from "@supabase/supabase-js"

import { isMissingDbFunctionError } from "@/lib/plans"

/**
 * Asks the database whether the signed-in user may write this storage object
 * (`storage_path_authorized`, the same rule the storage policies use).
 *
 * "unavailable" means the function isn't deployed yet (storage security
 * migration not applied). Callers then keep their previous behaviour, so the
 * code can ship before or after the migration.
 */
export type StoragePathAccess = "allowed" | "denied" | "unavailable"

export async function checkStoragePathAccess(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<StoragePathAccess> {
  const { data, error } = await supabase.rpc("storage_path_authorized", {
    p_bucket: bucket,
    p_name: path,
  })

  if (error) {
    if (isMissingDbFunctionError(error)) {
      return "unavailable"
    }
    console.error("[storage-access] Authorization check failed", {
      bucket,
      error: error.message,
    })
    return "denied"
  }

  return data === true ? "allowed" : "denied"
}
