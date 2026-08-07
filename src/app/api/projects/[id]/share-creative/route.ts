import { createClient } from "@/lib/supabase/server"
import {
  ShareCreativeError,
  getShareCandidates,
  sendShareInvites,
} from "@/lib/share-creative-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const creativeId = (searchParams.get("creativeId") || "").trim()

    if (!creativeId) {
      return Response.json({ error: "creativeId is required" }, { status: 400 })
    }

    const payload = await getShareCandidates(
      supabase,
      user.id,
      projectId,
      creativeId
    )

    return Response.json(payload)
  } catch (error) {
    if (error instanceof ShareCreativeError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    console.error("Load share options failed:", error)
    return Response.json(
      { error: "Could not load share options. Please try again." },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      creativeId?: string
      recipientMemberIds?: string[]
    }

    const creativeId = (body.creativeId || "").trim()
    const recipientMemberIds = Array.isArray(body.recipientMemberIds)
      ? body.recipientMemberIds
      : []

    if (!creativeId) {
      return Response.json({ error: "creativeId is required" }, { status: 400 })
    }

    const result = await sendShareInvites(
      supabase,
      user.id,
      projectId,
      creativeId,
      recipientMemberIds
    )

    return Response.json(result)
  } catch (error) {
    if (error instanceof ShareCreativeError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    console.error("Share creative failed:", error)
    return Response.json(
      { error: "Something went wrong while sharing. Please try again." },
      { status: 500 }
    )
  }
}
