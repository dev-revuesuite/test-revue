// Server only: tells the team when the nightly billing check had a problem.
//
// The check is what catches missed webhooks, ends access after a failed payment
// and adds paid add-ons that were never confirmed. If it fails quietly, paying
// customers can stay locked (or lapsed ones unlocked) with nobody noticing, so
// a problem is emailed to the support inbox. Sending the alert never throws.

import { sendBillingEmail, type SendEmailFn } from "@/lib/billing/billing-notices"
import { isDailyJobFailure } from "@/lib/daily-jobs"
import { getInboxEmail } from "@/lib/send-support-email"

/**
 * What went wrong in a nightly billing run, in plain words, or null when
 * everything was fine (or billing isn't set up in this environment).
 */
export function describeBillingProblem(result: unknown): string[] | null {
  if (isDailyJobFailure(result)) {
    return ["The billing check stopped with an error before finishing. Some subscriptions may have been checked before it stopped; the logs show how far it got."]
  }
  if (!result || typeof result !== "object" || "skipped" in result) return null

  const r = result as Record<string, unknown>
  const count = (key: string) => (typeof r[key] === "number" ? (r[key] as number) : 0)
  const problems: string[] = []
  if (count("failed") > 0) {
    problems.push(`${count("failed")} subscription or owner check(s) failed (of ${count("checked")} subscriptions and ${count("owners")} owners).`)
  }
  if (count("addonsFailed") > 0) problems.push(`${count("addonsFailed")} add-on order check(s) failed.`)
  if (count("emailsFailed") > 0) problems.push(`${count("emailsFailed")} customer email(s) could not be sent (they will be retried).`)
  return problems.length > 0 ? problems : null
}

/** Emails the support inbox if the run had a problem. Returns true when an alert was sent. */
export async function alertBillingProblem(result: unknown, send: SendEmailFn = sendBillingEmail): Promise<boolean> {
  try {
    const problems = describeBillingProblem(result)
    if (!problems) return false
    return await send({
      to: getInboxEmail(),
      subject: "[Revue billing] The nightly billing check had a problem",
      text: [
        "The nightly billing check finished with problems:",
        "",
        ...problems.map((p) => `- ${p}`),
        "",
        "It runs again tomorrow night and will retry. Details are in the Vercel logs",
        "(search for [billing-reconcile] and [Billing reconcile]).",
        "If the same problem repeats, check the Razorpay keys and webhook, and the billing admin page.",
      ].join("\n"),
    })
  } catch (error) {
    console.error("[billing-alert] Couldn't send the alert:", error instanceof Error ? error.message : String(error))
    return false
  }
}
