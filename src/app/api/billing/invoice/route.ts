import { BillingConfigError, getBillingConfig } from "@/lib/billing/billing-plans"
import { createRazorpayApi, RazorpayApiError } from "@/lib/billing/razorpay-api"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PAY_ID = /^pay_[A-Za-z0-9]{1,64}$/

const text = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })

/**
 * Opens the Razorpay invoice of one of the signed-in owner's payments.
 * GET /api/billing/invoice?payment=pay_...
 *
 * The payment is looked up with the user's own session, so row-level security
 * decides who may see it (only the buyer). The invoice link is then fetched
 * from Razorpay with the server's key and the browser is sent there.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return text("Please sign in to view this invoice.", 401)

    const paymentId = new URL(request.url).searchParams.get("payment") ?? ""
    if (!PAY_ID.test(paymentId)) return text("Invoice not found.", 404)

    const { data, error } = await supabase
      .from("billing_payments")
      .select("razorpay_invoice_id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle()
    if (error) {
      console.error("[billing-invoice] Payment lookup failed:", error.message)
      return text("Couldn't load the invoice. Please try again.", 500)
    }
    const invoiceId = data?.razorpay_invoice_id as string | null | undefined
    if (!invoiceId) return text("Invoice not found.", 404)

    const url = await createRazorpayApi(getBillingConfig()).fetchInvoiceUrl(invoiceId)
    if (!url) return text("This invoice isn't available online. Contact us from the Help Desk.", 404)

    return Response.redirect(url, 302)
  } catch (error) {
    if (error instanceof BillingConfigError) {
      console.error("[billing-invoice] Billing is not configured:", error.message)
      return text("Invoices aren't available right now.", 503)
    }
    if (error instanceof RazorpayApiError) {
      console.error("[billing-invoice] Razorpay call failed:", error.httpStatus, error.message)
      return text("The payment provider isn't responding. Please try again.", 502)
    }
    console.error("[billing-invoice] Request failed:", error instanceof Error ? error.message : String(error))
    return text("Couldn't load the invoice. Please try again.", 500)
  }
}
