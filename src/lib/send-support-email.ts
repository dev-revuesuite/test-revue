import {
  SUPPORT_INBOX_EMAIL,
  type SupportFormConfig,
} from "@/lib/support-request-config"

/**
 * Sends Help Desk emails through Resend's REST API (no SDK dependency).
 *
 * Environment variables (server-only, never exposed to the client):
 *   RESEND_API_KEY       – if missing, sending is skipped entirely; the request
 *                          row in `support_requests` remains the record.
 *   SUPPORT_FROM_EMAIL   – verified sender, e.g. "RevueSuite <support@revuesuite.com>"
 *   SUPPORT_INBOX_EMAIL  – optional override of the team inbox
 *                          (defaults to admin@revuesuite.com)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"

interface SupportEmailInput {
  form: SupportFormConfig
  /** Validated, trimmed answers keyed by field key. */
  fields: Record<string, string>
  reporterName: string
  reporterEmail: string
  organizationName: string | null
  pageUrl: string
  userAgent: string
  submittedAt: Date
}

export function getInboxEmail(): string {
  return process.env.SUPPORT_INBOX_EMAIL || SUPPORT_INBOX_EMAIL
}

function buildEmailBody(input: SupportEmailInput): string {
  const { form, fields } = input

  const lines: string[] = [form.emailTag, ""]

  for (const field of form.fields) {
    const value = fields[field.key]
    if (!value) continue
    lines.push(`${field.label}:`, value, "")
  }

  lines.push(
    "---",
    "",
    `User:`,
    `${input.reporterName} <${input.reporterEmail}>`,
    "",
    `Organization:`,
    input.organizationName ?? "(none)",
    "",
    `Page:`,
    input.pageUrl || "(unknown)",
    "",
    `Browser:`,
    input.userAgent || "(unknown)",
    "",
    `Timestamp:`,
    input.submittedAt.toISOString()
  )

  return lines.join("\n")
}

async function sendViaResend(payload: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.SUPPORT_FROM_EMAIL
  if (!apiKey || !from) {
    console.warn(
      "[support-email] Skipped send — set RESEND_API_KEY and SUPPORT_FROM_EMAIL on the server (restart dev after .env changes)."
    )
    return false
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        ...(payload.replyTo ? { reply_to: [payload.replyTo] } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error(
        `[support-email] Resend rejected send (${response.status}): ${detail}`
      )
      return false
    }

    return true
  } catch (error) {
    console.error("[support-email] Failed to reach Resend:", error)
    return false
  }
}

/**
 * Sends the notification to the team inbox and a best-effort acknowledgement
 * to the reporter. Returns true when the TEAM email was accepted (the
 * acknowledgement never affects the outcome).
 */
export async function sendSupportEmails(
  input: SupportEmailInput
): Promise<boolean> {
  const subjectValue = input.fields[input.form.subjectField] ?? ""
  const subject = `[${input.form.emailTag}] ${subjectValue}`.slice(0, 250)

  const teamSent = await sendViaResend({
    to: getInboxEmail(),
    subject,
    text: buildEmailBody(input),
    // The whole support model is "reply to the user's email".
    replyTo: input.reporterEmail,
  })

  if (teamSent && input.reporterEmail) {
    // Best-effort acknowledgement; failure here is intentionally ignored.
    await sendViaResend({
      to: input.reporterEmail,
      subject: "We received your request — RevueSuite Support",
      text: [
        `Hi ${input.reporterName},`,
        "",
        "Thanks for contacting RevueSuite Support. We've received your request and will get back to you at this email address.",
        "",
        `Your request: ${subject}`,
        "",
        `If you have screenshots or files that would help, just reply to this email and attach them.`,
        "",
        "— The RevueSuite team",
        getInboxEmail(),
      ].join("\n"),
    })
  }

  return teamSent
}
