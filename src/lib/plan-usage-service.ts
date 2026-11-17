import type { SupabaseClient } from "@supabase/supabase-js"

import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"
import {
  isMissingDbFunctionError,
  QC_LIMIT_REACHED_CODE,
  QC_NOT_CONFIGURED_CODE,
  TRIAL_EXPIRED_CODE,
  TRIAL_EXPIRED_MESSAGE,
  type QcBalance,
} from "@/lib/plans"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

export class QcUsageError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
    readonly code?: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = "QcUsageError"
  }
}

export interface ConsumeQcRunInput {
  /** The signed-in user running the check; used to refund it if the check fails. */
  userId: string
  organizationId: string
  source: "studio" | "quick"
  /** Iteration id (studio) or quick analysis id (quick). */
  refId: string
  pageNumber: number
  analysisType: PersistedAiAnalysisType
}

type ConsumeQcRunResponse = QcBalance & {
  allowed: boolean
  event_id?: string
  code?: string
}

function qcLimitReachedMessage(balance: QcBalance): string {
  const limit = (balance.limit ?? 0).toLocaleString("en-IN")
  // Reached only once the plan allowance and every QC pack are used up.
  const packNote = balance.packs?.length ? " Your QC packs are used up too." : ""
  if (balance.period === "day") {
    return `Out of QC runs: all ${limit} for today are used.${packNote} Resets at midnight IST. Add a QC pack or upgrade to continue.`
  }
  const resetDate = new Date(balance.resets_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  })
  return `Out of QC runs: all ${limit} for this month are used.${packNote} Resets on ${resetDate}. Add a QC pack or upgrade to continue.`
}

/**
 * Reserves one QC run (one check on one page) before inference runs.
 * Throws a 402 QcUsageError when the plan's allowance is used up.
 * Returns the ledger event id so a failed check can be refunded.
 */
export async function consumeQcRun(
  supabase: SupabaseClient,
  input: ConsumeQcRunInput
): Promise<{ eventId: string; balance: QcBalance }> {
  const { data, error } = await supabase.rpc("consume_qc_run", {
    p_organization_id: input.organizationId,
    p_source: input.source,
    p_ref_id: input.refId,
    p_page_number: input.pageNumber,
    p_analysis_type: input.analysisType,
  })

  if (error) {
    if (error.code === "42501") {
      throw new QcUsageError(error.message, 403, undefined, error)
    }
    throw new QcUsageError("Failed to check QC run balance", 500, undefined, error)
  }

  const result = data as ConsumeQcRunResponse | null
  if (!result) {
    throw new QcUsageError("Failed to check QC run balance", 500)
  }

  if (!result.allowed && result.code === TRIAL_EXPIRED_CODE) {
    throw new QcUsageError(TRIAL_EXPIRED_MESSAGE, 402, TRIAL_EXPIRED_CODE)
  }

  if (!result.allowed && result.code === QC_NOT_CONFIGURED_CODE) {
    throw new QcUsageError(
      "QC runs aren't set up for your plan yet. Contact support.",
      402,
      QC_NOT_CONFIGURED_CODE
    )
  }

  if (!result.allowed) {
    throw new QcUsageError(
      qcLimitReachedMessage(result),
      402,
      QC_LIMIT_REACHED_CODE
    )
  }

  if (!result.event_id) {
    throw new QcUsageError("Failed to record QC run", 500)
  }

  return {
    eventId: result.event_id,
    balance: {
      plan_id: result.plan_id,
      limit: result.limit,
      used: result.used,
      remaining: result.remaining,
      period: result.period,
      window_start: result.window_start,
      resets_at: result.resets_at,
      pack_remaining: result.pack_remaining,
      packs: result.packs,
      enforced: result.enforced,
    },
  }
}

function logRefundFailure(
  eventId: string,
  via: string,
  error: { message: string } | null,
  refunded: unknown
): void {
  console.error("[QC usage] Refund failed", {
    eventId,
    via,
    error: error?.message ?? null,
    refunded: refunded ?? null,
  })
}

/**
 * Gives back a run whose check failed. Never throws: a failed refund is only logged.
 *
 * Refunds go through the service role (`refund_qc_run_as_service`), so users
 * can't refund their own successful runs by calling the database directly.
 * Falls back to the old user-session `refund_qc_run` only when the new function
 * isn't in the database yet or the service role isn't configured.
 */
export async function refundQcRun(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<void> {
  if (isAdminClientConfigured()) {
    const { data, error } = await createAdminClient().rpc("refund_qc_run_as_service", {
      p_event_id: eventId,
      p_user_id: userId,
    })

    if (!error) {
      if (data !== true) logRefundFailure(eventId, "service", null, data)
      return
    }

    if (!isMissingDbFunctionError(error)) {
      logRefundFailure(eventId, "service", error, data)
      return
    }
    // New function not deployed yet: use the old path below.
  }

  const { data, error } = await supabase.rpc("refund_qc_run", {
    p_event_id: eventId,
  })

  if (error || data !== true) {
    logRefundFailure(eventId, "user-session", error, data)
  }
}

/**
 * Runs `work` with one reserved QC run, refunding it if `work` throws before
 * its results are saved. `work` calls `markSaved()` once the results are
 * stored; a failure after that (e.g. reloading them) keeps the run counted.
 */
export async function withQcRun<T>(
  supabase: SupabaseClient,
  input: ConsumeQcRunInput,
  work: (markSaved: () => void) => Promise<T>
): Promise<T> {
  const { eventId } = await consumeQcRun(supabase, input)
  let saved = false
  try {
    return await work(() => {
      saved = true
    })
  } catch (error) {
    if (!saved) await refundQcRun(supabase, eventId, input.userId)
    throw error
  }
}
