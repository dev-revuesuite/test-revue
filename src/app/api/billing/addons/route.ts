import { startAddonOrder } from "@/lib/billing/addon-service"
import { createAddonStore } from "@/lib/billing/addon-store"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { isBillingEnabled } from "@/lib/billing/plan-prices"
import { createRazorpayApi } from "@/lib/billing/razorpay-api"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Starts an add-on purchase. Body: { organizationId, item } where item is an ID
 * from the add-on catalog (e.g. "qc_500"). Returns { orderId, keyId, amountPaise,
 * item } for the Razorpay payment window. Owner only. The price comes from the
 * server's catalog; this call grants nothing.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (!isBillingEnabled()) {
      return Response.json({ error: "Add-ons aren't available yet", code: "BILLING_DISABLED" }, { status: 503 })
    }

    const body = (await request.json().catch(() => null)) as { organizationId?: unknown; item?: unknown } | null
    const organizationId = body?.organizationId
    if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
      return Response.json({ error: "Invalid organization", code: "INVALID_ORGANIZATION" }, { status: 400 })
    }

    if (!isAdminClientConfigured()) {
      return Response.json({ error: "Billing is not available right now", code: "BILLING_NOT_CONFIGURED" }, { status: 503 })
    }
    const config = getBillingConfig()
    const admin = createAdminClient()

    const result = await startAddonOrder(
      { userId: user.id, organizationId, itemId: body?.item },
      { store: createAddonStore(admin), razorpay: createRazorpayApi(config), keyId: config.keyId },
    )
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingRequestError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    if (error instanceof BillingConfigError) {
      console.error("[billing-addon] Billing is not configured:", error.message)
      return Response.json({ error: "Billing is not available right now", code: error.code }, { status: 503 })
    }
    console.error("[billing-addon] Request failed:", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Couldn't start the purchase. Please try again." }, { status: 500 })
  }
}
