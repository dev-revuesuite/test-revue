import { afterResponse } from "@/lib/billing/after-response"

import { createApplyEvent } from "@/lib/billing/apply-event"
import { sendBillingNoticeEmails } from "@/lib/billing/billing-notices"
import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { cancelPlan } from "@/lib/billing/cancel-service"
import { createRazorpayApi } from "@/lib/billing/razorpay-api"
import { BillingRequestError } from "@/lib/billing/subscribe-service"
import { createSubscribeStore } from "@/lib/billing/subscribe-store"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Cancels the owner's plan (covers all their workspaces). Body: { organizationId }.
 * Returns { atPeriodEnd, endsAt }.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => null)) as { organizationId?: unknown } | null
    const organizationId = body?.organizationId
    if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
      return Response.json({ error: "Invalid organization", code: "INVALID_ORGANIZATION" }, { status: 400 })
    }

    if (!isAdminClientConfigured()) {
      return Response.json({ error: "Billing is not available right now", code: "BILLING_NOT_CONFIGURED" }, { status: 503 })
    }
    const config = getBillingConfig()
    const admin = createAdminClient()

    const result = await cancelPlan(
      { userId: user.id, organizationId },
      {
        store: createSubscribeStore(admin),
        razorpay: createRazorpayApi(config),
        applyEvent: createApplyEvent(admin, { notify: true }),
      },
    )
    // Emails (payment failed / plan ended) go out after the response.
    afterResponse(() => sendBillingNoticeEmails(admin))
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingRequestError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    if (error instanceof BillingConfigError) {
      console.error("[billing-cancel] Billing is not configured:", error.message)
      return Response.json({ error: "Billing is not available right now", code: error.code }, { status: 503 })
    }
    console.error("[billing-cancel] Request failed:", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Couldn't cancel the plan. Please try again." }, { status: 500 })
  }
}
