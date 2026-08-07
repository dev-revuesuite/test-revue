import { createClient } from "@/lib/supabase/server"
import {
  linearizeCreativePdfInStorage,
  type CreativePdfBucket,
} from "@/lib/linearize-creative-pdf"
import { PdfLinearizeError } from "@/lib/linearize-pdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface LinearizePdfRequestBody {
  bucket?: CreativePdfBucket
  storagePath?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as LinearizePdfRequestBody
    const bucket = body.bucket
    const storagePath = body.storagePath?.trim()

    if (!bucket || !storagePath) {
      return Response.json(
        { error: "bucket and storagePath are required" },
        { status: 400 }
      )
    }

    const result = await linearizeCreativePdfInStorage(
      supabase,
      bucket,
      storagePath
    )

    return Response.json(result)
  } catch (error) {
    if (error instanceof PdfLinearizeError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    const message =
      error instanceof Error ? error.message : "Failed to linearize PDF"
    return Response.json({ error: message }, { status: 500 })
  }
}
