import { afterResponse } from "@/lib/billing/after-response"

import { createApplyAddon } from "@/lib/billing/addon-store"
import { createApplyEvent } from "@/lib/billing/apply-event"
import { sendBillingNoticeEmails } from "@/lib/billing/billing-notices"
import { handleRazorpayWebhook } from "@/lib/billing/webhook-service"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Razorpay webhook: https://revuesuite.com/qc-tool/api/billing/webhook
 * The only place that changes an organization's paid plan. No user session:
 * trust comes from the X-Razorpay-Signature check in handleRazorpayWebhook.
 */
export async function POST(request: Request) {
  if (!isAdminClientConfigured()) {
    console.error("[billing-webhook] Supabase service role is not configured")
    return Response.json({ error: "Not configured" }, { status: 503 })
  }

  const admin = createAdminClient()

  // Exact bytes as sent: the signature is over the raw body.
  const rawBody = new Uint8Array(await request.arrayBuffer())

  const { status, body } = await handleRazorpayWebhook(
    {
      rawBody,
      signature: request.headers.get("x-razorpay-signature"),
      eventId: request.headers.get("x-razorpay-event-id"),
    },
    {
      secret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined,
      applyEvent: createApplyEvent(admin, { notify: true }),
      applyAddon: createApplyAddon(admin),
    },
  )

  // Emails (payment failed / plan ended) go out after Razorpay has its answer.
  if (status === 200) afterResponse(() => sendBillingNoticeEmails(admin))

  return Response.json(body, { status })
}
