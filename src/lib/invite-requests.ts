import { apiPath } from "@/lib/base-path"

/** Browser helpers for POST /api/invitations. They never throw. */

export async function requestMemberInvite(
  memberId: string
): Promise<{ sent: boolean; error: string | null }> {
  try {
    const response = await fetch(apiPath("/api/invitations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "member", memberId }),
    })
    const payload = (await response.json().catch(() => ({}))) as {
      sent?: boolean
      error?: string
    }
    if (!response.ok) {
      return { sent: false, error: payload.error || "Couldn't send the invite." }
    }
    return payload.sent
      ? { sent: true, error: null }
      : { sent: false, error: "The invite email couldn't be sent." }
  } catch {
    return { sent: false, error: "Couldn't send the invite." }
  }
}

export async function requestClientInvites(
  clientId: string,
  { resend = false }: { resend?: boolean } = {}
): Promise<{ sent: number; failed: number; error: string | null }> {
  try {
    const response = await fetch(apiPath("/api/invitations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "client", clientId, resend }),
    })
    const payload = (await response.json().catch(() => ({}))) as {
      sent?: number
      failed?: number
      error?: string
    }
    if (!response.ok) {
      return { sent: 0, failed: 0, error: payload.error || "Couldn't send the invites." }
    }
    return { sent: payload.sent ?? 0, failed: payload.failed ?? 0, error: null }
  } catch {
    return { sent: 0, failed: 0, error: "Couldn't send the invites." }
  }
}
