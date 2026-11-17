import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import {
  cancelStorageUpload,
  completeStorageUpload,
  discardStorageUpload,
  isUuid,
  StorageUploadError,
} from "@/lib/storage-upload-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * complete | cancel | discard for a storage reservation. Only the user who
 * created the reservation can act on it (checked in the database functions).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await context.params

    if (!isUuid(id)) {
      return Response.json({ error: "Upload not found" }, { status: 404 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminClientConfigured()) {
      return Response.json({ error: "Uploads are not configured" }, { status: 500 })
    }

    const admin = createAdminClient()

    switch (action) {
      case "complete":
        await completeStorageUpload(admin, user.id, id)
        break
      case "cancel":
        await cancelStorageUpload(admin, user.id, id)
        break
      case "discard":
        await discardStorageUpload(admin, user.id, id)
        break
      default:
        return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof StorageUploadError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }
    console.error("[storage-upload] Action failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: "Upload action failed" }, { status: 500 })
  }
}
