/**
 * Invite emails, sent through Resend's REST API (server only).
 *
 *   RESEND_API_KEY     – required; without it nothing is sent.
 *   INVITE_FROM_EMAIL  – optional sender, default "Revue <noreply@revuesuite.com>".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const DEFAULT_FROM = "Revue <noreply@revuesuite.com>"

export interface InviteEmailInput {
  to: string
  inviteUrl: string
  organizationName: string
  inviterName: string | null
  /** Set for client invites. */
  clientName: string | null
  expiresAt: Date
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

export function buildInviteEmail(input: InviteEmailInput): {
  subject: string
  text: string
  html: string
} {
  const who = input.inviterName?.trim() || input.organizationName
  const what = input.clientName
    ? `review ${input.clientName}'s designs with ${input.organizationName}`
    : `join ${input.organizationName}`
  const subject = `${who} invited you to ${what} on Revue`.slice(0, 250)
  const expires = formatExpiry(input.expiresAt)

  const text = [
    `${who} invited you to ${what} on Revue.`,
    "",
    "Accept the invite:",
    input.inviteUrl,
    "",
    `This link works until ${expires}. Use it with this email address (${input.to}).`,
    "",
    "If you weren't expecting this invite, you can ignore this email.",
  ].join("\n")

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:520px">
  <h2 style="margin:0 0 12px">You're invited to Revue</h2>
  <p style="margin:0 0 20px">${escapeHtml(who)} invited you to ${escapeHtml(what)} on Revue.</p>
  <p style="margin:0 0 24px">
    <a href="${escapeHtml(input.inviteUrl)}"
       style="display:inline-block;background:#DBFE52;color:#000;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;border:1px solid #9ca3af">
      Accept invite
    </a>
  </p>
  <p style="margin:0 0 8px;color:#555;font-size:13px">
    This link works until ${escapeHtml(expires)}. Use it with this email address (${escapeHtml(input.to)}).
  </p>
  <p style="margin:0 0 8px;color:#555;font-size:13px">
    Or copy this link: <br><span style="word-break:break-all">${escapeHtml(input.inviteUrl)}</span>
  </p>
  <p style="margin:16px 0 0;color:#555;font-size:13px">If you weren't expecting this invite, you can ignore this email.</p>
</div>`.trim()

  return { subject, text, html }
}

/** Returns true when Resend accepted the email. Never throws. */
export async function sendInviteEmail(input: InviteEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[invite-email] Skipped send: RESEND_API_KEY is not set.")
    return false
  }
  const from = process.env.INVITE_FROM_EMAIL?.trim() || DEFAULT_FROM
  const { subject, text, html } = buildInviteEmail(input)

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from, to: [input.to], subject, text, html }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error(`[invite-email] Resend rejected send (${response.status}): ${detail.slice(0, 300)}`)
      return false
    }
    return true
  } catch (error) {
    console.error("[invite-email] Failed to reach Resend:", error)
    return false
  }
}
