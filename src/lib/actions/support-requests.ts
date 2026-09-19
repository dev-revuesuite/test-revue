"use server"

import { createClient } from "@/lib/supabase/server"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { sendSupportEmails } from "@/lib/send-support-email"
import {
  SUPPORT_INBOX_EMAIL,
  SUPPORT_REQUEST_FORMS,
  type SupportRequestType,
} from "@/lib/support-request-config"

const MAX_REQUESTS_PER_HOUR = 5

interface SubmitSupportRequestInput {
  type: SupportRequestType
  /** Raw form answers keyed by field key; validated server-side. */
  fields: Record<string, string>
  pageUrl?: string
  userAgent?: string
}

interface SubmitSupportRequestResult {
  success: boolean
  /** False when the row was saved but Resend did not accept the team email. */
  emailDelivered?: boolean
  error?: string
}

export async function submitSupportRequest(
  input: SubmitSupportRequestInput
): Promise<SubmitSupportRequestResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You need to be signed in to send a request." }
  }

  const form = SUPPORT_REQUEST_FORMS[input.type]
  if (!form) {
    return { success: false, error: "Unknown request type." }
  }

  // Validate against the shared field config; ignore any unknown keys.
  const cleaned: Record<string, string> = {}
  for (const field of form.fields) {
    const raw = (input.fields?.[field.key] ?? "").trim()
    if (field.required && !raw) {
      return { success: false, error: `"${field.label}" is required.` }
    }
    if (raw.length > field.maxLength) {
      return {
        success: false,
        error: `"${field.label}" must be at most ${field.maxLength} characters.`,
      }
    }
    if (raw) cleaned[field.key] = raw
  }

  const pageUrl = (input.pageUrl ?? "").slice(0, 2048)
  const userAgent = (input.userAgent ?? "").slice(0, 512)

  // Basic abuse guard: cap submissions per user per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo)

  if (countError) {
    console.error("[support-requests] Rate-limit check failed:", countError)
    return {
      success: false,
      error: `Something went wrong while sending your request. Please try again, or email ${SUPPORT_INBOX_EMAIL} directly.`,
    }
  }

  if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    return {
      success: false,
      error: `You've sent several requests recently. Please wait a while before sending another, or email ${SUPPORT_INBOX_EMAIL} directly.`,
    }
  }

  // Identity and organization come from the session, never from the client.
  const [{ data: profile }, organization] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveOrganization(supabase, user.id),
  ])

  const reporterName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Unknown"
  const reporterEmail = user.email ?? ""

  const subject = (cleaned[form.subjectField] ?? "").slice(0, 200)

  // Persist first: the row is the source of truth even if email fails.
  const { data: row, error: insertError } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      organization_id: organization?.id ?? null,
      reporter_email: reporterEmail,
      reporter_name: reporterName,
      request_type: form.type,
      subject,
      details: cleaned,
      page_url: pageUrl,
      user_agent: userAgent,
    })
    .select("id")
    .single()

  if (insertError || !row) {
    console.error("[support-requests] Insert failed:", insertError)
    return {
      success: false,
      error: `Something went wrong while sending your request. Please try again, or email ${SUPPORT_INBOX_EMAIL} directly.`,
    }
  }

  const emailSent = await sendSupportEmails({
    form,
    fields: cleaned,
    reporterName,
    reporterEmail,
    organizationName: organization?.name ?? null,
    pageUrl,
    userAgent,
    submittedAt: new Date(),
  })

  if (emailSent) {
    const { error: markError } = await supabase.rpc(
      "mark_support_request_emailed",
      { p_request_id: row.id }
    )
    if (markError) {
      // Non-fatal: the request is stored and the email went out.
      console.error("[support-requests] Failed to mark email sent:", markError)
    }
  }

  return { success: true, emailDelivered: emailSent }
}
