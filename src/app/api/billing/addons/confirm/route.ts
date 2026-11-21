import { confirmAddonOrder } from "@/lib/billing/addon-service"
import { createAddonStore, createApplyAddon } from "@/lib/billing/addon-store"
import { BillingRequestError } from "@/lib/billing/billing-errors"
import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { createRazorpayApi } from "@/lib/billing/razorpay-api"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ORDER_ID = /^order_[A-Za-z0-9]{1,64}$/

/**
 * Checks one of the signed-in user's add-on orders with Razorpay and adds the
 * purchase if it is paid. Body: { orderId }. Returns { status: "granted" | "pending" }.
 * The browser can't fake it: "paid" comes from Razorpay's API, not from the request.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null
    const orderId = body?.orderId
    if (typeof orderId !== "string" || !ORDER_ID.test(orderId)) {
      return Response.json({ error: "We couldn't find that purchase.", code: "ORDER_NOT_FOUND" }, { status: 404 })
    }

    if (!isAdminClientConfigured()) {
      return Response.json({ error: "Billing is not available right now", code: "BILLING_NOT_CONFIGURED" }, { status: 503 })
    }
    const config = getBillingConfig()
    const admin = createAdminClient()

    const result = await confirmAddonOrder(
      { userId: user.id, orderId },
      { store: createAddonStore(admin), razorpay: createRazorpayApi(config), applyAddon: createApplyAddon(admin) },
    )
    return Response.json({ status: result.status })
  } catch (error) {
    if (error instanceof BillingRequestError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    if (error instanceof BillingConfigError) {
      console.error("[billing-addon] Billing is not configured:", error.message)
      return Response.json({ error: "Billing is not available right now", code: error.code }, { status: 503 })
    }
    console.error("[billing-addon] Confirm failed:", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Couldn't check the payment. Please try again." }, { status: 500 })
  }
}
