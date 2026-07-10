import { createClient } from "@/lib/supabase/server"
import {
  CreativePreviewError,
  generateCreativePreview,
} from "@/lib/creative-preview"
import { CreativeStorageError } from "@/lib/creative-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
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

    const result = await generateCreativePreview(supabase, id)

    return Response.json(result)
  } catch (error) {
    if (
      error instanceof CreativePreviewError ||
      error instanceof CreativeStorageError
    ) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate preview"
    return Response.json({ error: message }, { status: 500 })
  }
}
