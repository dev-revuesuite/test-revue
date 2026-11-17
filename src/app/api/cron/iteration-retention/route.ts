import { timingSafeEqual } from "node:crypto"

import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { isDailyJobFailure, runIsolated } from "@/lib/daily-jobs"
import { runIterationRetention } from "@/lib/iteration-retention-service"
import { runStorageReservationCleanup } from "@/lib/storage-reservation-cleanup"
import { runTrialReminders } from "@/lib/trial-reminder-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? ""
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

/**
 * Daily version-history retention (Vercel Cron). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`. `?dryRun=1` reports what would be
 * warned or deleted without changing anything.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error("[Iteration retention] CRON_SECRET is not configured")
    return Response.json({ error: "Not configured" }, { status: 500 })
  }

  if (!isAuthorized(request, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isAdminClientConfigured()) {
    console.error("[Iteration retention] Supabase service role is not configured")
    return Response.json({ error: "Not configured" }, { status: 500 })
  }

  const dryRunParam = new URL(request.url).searchParams.get("dryRun")
  const dryRun = dryRunParam === "1" || dryRunParam === "true"

  try {
    const admin = createAdminClient()

    // Each job is isolated: a failure is logged and the next job still runs.
    const result = await runIsolated(
      "Iteration retention",
      () => runIterationRetention(admin, { dryRun }),
      (r) => ({
        dryRun,
        candidates: r.candidates,
        warnedOrgs: r.warned.length,
        deleted: r.deleted.length,
        cleared: r.cleared,
        failed: r.failed.length,
      })
    )

    // Daily storage housekeeping: close expired upload reservations and
    // remove uploads that were never confirmed.
    const storageCleanup = await runIsolated("Storage cleanup", () =>
      runStorageReservationCleanup(admin, { dryRun })
    )

    // Free-trial reminders. Isolated: a failure here doesn't fail the run, and
    // undelivered reminders are retried on the next run.
    const trialReminders = await runIsolated("Trial reminders", () =>
      runTrialReminders(admin, { dryRun })
    )

    if (isDailyJobFailure(result)) {
      // The other jobs ran; still report the run as failed so it gets noticed.
      return Response.json(
        { error: "Retention run failed", storageCleanup, trialReminders },
        { status: 500 }
      )
    }

    return Response.json({ ...result, storageCleanup, trialReminders })
  } catch (error) {
    console.error("[Iteration retention] Run failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: "Retention run failed" }, { status: 500 })
  }
}
