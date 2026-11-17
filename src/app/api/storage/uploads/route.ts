import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import {
  createStorageUpload,
  StorageUploadError,
} from "@/lib/storage-upload-service"
import type { StorageUploadRequest } from "@/lib/storage-upload-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Authorizes an upload, reserves storage and returns a signed upload URL. */
export async function POST(request: Request) {
  try {
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

    let body: StorageUploadRequest
    try {
      body = (await request.json()) as StorageUploadRequest
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const grant = await createStorageUpload(supabase, createAdminClient(), user.id, {
      category: body.category,
      fileName: body.fileName,
      size: body.size,
      contentType: body.contentType,
      target: body.target ?? {},
    })

    return Response.json(grant)
  } catch (error) {
    if (error instanceof StorageUploadError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }
    console.error("[storage-upload] Request failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: "Couldn't start the upload. Please try again." }, { status: 500 })
  }
}
