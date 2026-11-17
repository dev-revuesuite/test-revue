import type { SupabaseClient } from "@supabase/supabase-js"

import { isMissingDbFunctionError } from "@/lib/plans"

export type TrialReminderRunResult =
  | { skipped: true; reason: string }
  | ({ skipped?: false } & Record<string, unknown>)

/**
 * Daily free-trial reminders (3 days left, 1 day left, ended). All the work
 * (queue once, deliver, retry failures) happens in the database function
 * run_trial_reminders, so overlapping or repeated runs never double-send.
 * Must be called with the service-role client.
 */
export async function runTrialReminders(
  admin: SupabaseClient,
  { dryRun }: { dryRun: boolean }
): Promise<TrialReminderRunResult> {
  const { data, error } = await admin.rpc("run_trial_reminders", { p_dry_run: dryRun })

  if (error) {
    if (isMissingDbFunctionError(error)) {
      return { skipped: true, reason: "Trial reminders migration not applied" }
    }
    throw new Error(`Trial reminders failed: ${error.message}`)
  }

  return (data ?? {}) as Record<string, unknown>
}
