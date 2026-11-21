"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"

import { useTimezone } from "@/contexts/timezone-context"
import { useBillingContext } from "@/contexts/plan-features-context"
import { formatInstantInZone } from "@/lib/timezone-preference"

function dismissKey(graceEndsAt: string | null) {
  return `revue:payment-issue-bar:${graceEndsAt ?? "none"}:${new Date().toISOString().slice(0, 10)}`
}

/**
 * "Payment failed" bar for the paying owner while the 7-day grace period runs
 * (mounted once in the app layout). Dismissable for the rest of the day.
 */
export function PaymentIssueBar() {
  const { paymentIssue } = useBillingContext()
  const { timeZone } = useTimezone()
  const [hidden, setHidden] = React.useState(true)

  // Browser storage is only readable after mount.
  React.useEffect(() => {
    if (!paymentIssue) return
    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(dismissKey(paymentIssue.graceEndsAt)) === "1"
    } catch {
      // storage blocked: show the bar
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage once after mount */
    setHidden(dismissed)
  }, [paymentIssue])

  if (!paymentIssue || hidden) return null

  const by = paymentIssue.graceEndsAt ? formatInstantInZone(paymentIssue.graceEndsAt, timeZone) : "soon"

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 shadow-lg dark:border-red-500/30 dark:bg-red-950 dark:text-red-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        Your last payment failed. Fix it by {by} to keep your workspaces running.
      </span>
      <Link href="/account?tab=plan" className="shrink-0 font-medium underline">
        Details
      </Link>
      <button
        type="button"
        aria-label="Dismiss for today"
        className="rounded-md p-1 opacity-70 transition hover:opacity-100"
        onClick={() => {
          try {
            window.localStorage.setItem(dismissKey(paymentIssue.graceEndsAt), "1")
          } catch {
            // ignore
          }
          setHidden(true)
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
