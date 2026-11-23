import { createClient } from "@/lib/supabase/server"
import {
  InvitationServiceError,
  sendClientContactInvites,
  sendMemberInvite,
} from "@/lib/invitation-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Body =
  | { type: "member"; memberId?: unknown }
  | { type: "client"; clientId?: unknown; resend?: unknown }

/**
 * Emails invite links.
 *   { type: "member", memberId }            – a pending team member (also "Resend invite")
 *   { type: "client", clientId, resend? }   – a client's contacts who haven't joined
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const origin = new URL(request.url).origin

  try {
    if (body.type === "member") {
      const memberId = typeof body.memberId === "string" ? body.memberId : ""
      if (!UUID_PATTERN.test(memberId)) {
        return Response.json({ error: "memberId is required" }, { status: 400 })
      }
      const result = await sendMemberInvite(supabase, user.id, memberId, origin)
      return Response.json(result)
    }

    if (body.type === "client") {
      const clientId = typeof body.clientId === "string" ? body.clientId : ""
      if (!UUID_PATTERN.test(clientId)) {
        return Response.json({ error: "clientId is required" }, { status: 400 })
      }
      const result = await sendClientContactInvites(supabase, user.id, clientId, origin, {
        resend: body.resend === true,
      })
      return Response.json(result)
    }

    return Response.json({ error: "Unknown invite type" }, { status: 400 })
  } catch (error) {
    if (error instanceof InvitationServiceError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("[invitations] Unexpected error:", error)
    return Response.json({ error: "Couldn't send the invite. Please try again." }, { status: 500 })
  }
}
