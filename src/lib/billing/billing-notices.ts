// Server only: billing notices for the paying owner.
//
// The database decides what is due and sends the in-app (bell) notification
// once (billing_emit_notices). Urgent ones (payment failed, plan ended) also go
// by email: this file claims those from the database, sends them through
// Resend, and confirms each one. An email that fails stays unconfirmed and is
// retried by the nightly job (up to 5 attempts, for 3 days).
//
// Nothing here may break billing: every function swallows its errors.

import type { SupabaseClient } from "@supabase/supabase-js"

import { getConfiguredAppOrigin, withBasePath } from "@/lib/base-path"
import { isMissingDbFunctionError } from "@/lib/plans"

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const LOG = "[billing-notices]"

/**
 * Sends whatever notices are due for one subscription (or, with no ID, for
 * all of them). Returns how many were newly sent.
 */
export async function emitBillingNotices(
  admin: SupabaseClient,
  razorpaySubscriptionId?: string | null,
): Promise<number> {
  try {
    const { data, error } = await admin.rpc("billing_emit_notices", {
      p_razorpay_subscription_id: razorpaySubscriptionId ?? null,
    })
    if (error) {
      // Before the billing v7 migration: simply no notices.
      if (!isMissingDbFunctionError(error)) console.error(LOG, "Couldn't create notices:", error.message)
      return 0
    }
    return typeof data === "number" ? data : 0
  } catch (error) {
    console.error(LOG, "Couldn't create notices:", error instanceof Error ? error.message : String(error))
    return 0
  }
}

type ClaimedEmail = { id: string; kind: string; email: string; title: string; body: string }

export type SendEmailFn = (message: { to: string; subject: string; text: string }) => Promise<boolean>

/** Plain-text email: what happened, what to do, and where. */
export function buildNoticeEmail(notice: Pick<ClaimedEmail, "title" | "body">, planUrl: string): { subject: string; text: string } {
  return {
    subject: notice.title,
    text: [notice.body, "", `Open your plan: ${planUrl}`, "", "Revue"].join("\n"),
  }
}

/** Sends one plain-text email through Resend. False (never throws) when it could not be sent. */
export async function sendBillingEmail(message: { to: string; subject: string; text: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.SUPPORT_FROM_EMAIL
  if (!apiKey || !from) {
    console.warn(LOG, "Email skipped: RESEND_API_KEY and SUPPORT_FROM_EMAIL are not set.")
    return false
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
    })
    if (!response.ok) {
      console.error(LOG, `Resend refused an email (${response.status})`)
      return false
    }
    return true
  } catch (error) {
    console.error(LOG, "Couldn't reach Resend:", error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Sends the emails that are still owed. Safe to call often and from several
 * places at once: the database hands each email to one caller at a time.
 */
export async function sendBillingNoticeEmails(
  admin: SupabaseClient,
  send: SendEmailFn = sendBillingEmail,
): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 }
  try {
    const { data, error } = await admin.rpc("billing_claim_notice_emails", { p_limit: 20 })
    if (error) {
      if (!isMissingDbFunctionError(error)) console.error(LOG, "Couldn't load emails to send:", error.message)
      return result
    }
    const planUrl = `${getConfiguredAppOrigin()}${withBasePath("/account?tab=plan")}`
    for (const notice of (data ?? []) as ClaimedEmail[]) {
      if (!notice?.email || !notice.title) continue
      const ok = await send({ to: notice.email, ...buildNoticeEmail(notice, planUrl) })
      if (!ok) {
        result.failed++
        continue
      }
      const { error: markError } = await admin.rpc("billing_mark_notice_emailed", { p_id: notice.id })
      if (markError) console.error(LOG, "Email sent but couldn't be confirmed:", markError.message)
      result.sent++
    }
  } catch (error) {
    console.error(LOG, "Sending emails failed:", error instanceof Error ? error.message : String(error))
  }
  return result
}
