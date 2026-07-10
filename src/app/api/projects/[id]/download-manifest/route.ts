import { createClient } from "@/lib/supabase/server"
import {
  CreativeDownloadError,
  buildDownloadManifest,
} from "@/lib/creative-download-manifest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const manifest = await buildDownloadManifest(supabase, user.id, id)

    return Response.json(manifest)
  } catch (error) {
    if (error instanceof CreativeDownloadError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    const message =
      error instanceof Error ? error.message : "Failed to build download manifest"
    return Response.json({ error: message }, { status: 500 })
  }
}
