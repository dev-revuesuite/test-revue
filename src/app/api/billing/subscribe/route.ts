import { createApplyEvent } from "@/lib/billing/apply-event"
import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { isBillingEnabled } from "@/lib/billing/plan-prices"
import { createRazorpayApi } from "@/lib/billing/razorpay-api"
import { BillingRequestError, startSubscription } from "@/lib/billing/subscribe-service"
import { createSubscribeStore } from "@/lib/billing/subscribe-store"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Starts a checkout. Body: { organizationId, plan: "plus"|"business", cycle: "monthly"|"annual", replace? }.
 * `replace: true` = the customer confirmed switching away from a plan that is still running.
 * Returns { subscriptionId, keyId, plan, cycle } for the Razorpay checkout pop-up.
 * Owner only. Does not unlock anything (the webhook does).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Billing is switched on per environment; until then nobody can start a
    // checkout, even by calling this route directly.
    if (!isBillingEnabled()) {
      return Response.json({ error: "Upgrades aren't available yet", code: "BILLING_DISABLED" }, { status: 503 })
    }

    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object")
      body = parsed as Record<string, unknown>
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const organizationId = body.organizationId
    if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
      return Response.json({ error: "Invalid organization", code: "INVALID_ORGANIZATION" }, { status: 400 })
    }

    if (!isAdminClientConfigured()) {
      return Response.json({ error: "Billing is not available right now", code: "BILLING_NOT_CONFIGURED" }, { status: 503 })
    }
    const config = getBillingConfig()
    const admin = createAdminClient()

    const result = await startSubscription(
      { userId: user.id, organizationId, body: { plan: body.plan, cycle: body.cycle }, replace: body.replace === true },
      {
        store: createSubscribeStore(admin),
        razorpay: createRazorpayApi(config),
        config,
        // No notices here: these are bookkeeping steps while a new checkout starts.
        applyEvent: createApplyEvent(admin),
      },
    )
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingRequestError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    if (error instanceof BillingConfigError) {
      console.error("[billing-subscribe] Billing is not configured:", error.message)
      return Response.json({ error: "Billing is not available right now", code: error.code }, { status: 503 })
    }
    console.error("[billing-subscribe] Request failed:", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Couldn't start the checkout. Please try again." }, { status: 500 })
  }
}
