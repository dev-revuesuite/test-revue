// Server only: the one way billing events reach the database.
//
// Every caller (webhook, post-checkout check, cancel, nightly job) applies
// events through billing_apply_event. With `notify`, the owner's notices for
// that subscription are brought up to date right after (plan started, payment
// failed, cancelled...). Notices can never fail an event.

import type { SupabaseClient } from "@supabase/supabase-js"

import { emitBillingNotices } from "@/lib/billing/billing-notices"
import type { ApplyEventFn } from "@/lib/billing/sync-service"

export function createApplyEvent(admin: SupabaseClient, options: { notify?: boolean } = {}): ApplyEventFn {
  return async (event, payload) => {
    const { data, error } = await admin.rpc("billing_apply_event", { p_event: event, p_payload: payload })
    if (!error && options.notify) {
      if (event.subscription?.id) {
        await emitBillingNotices(admin, event.subscription.id)
      } else if (event.event_type.startsWith("refund.")) {
        // A refund names no subscription: look at all of them.
        await emitBillingNotices(admin, null)
      }
    }
    return { data, error }
  }
}
