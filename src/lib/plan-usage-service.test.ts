import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Refunds use the user-session path in these tests (no service role).
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("service role not used in tests")
  },
  isAdminClientConfigured: () => false,
}))

import { withQcRun, type ConsumeQcRunInput } from "@/lib/plan-usage-service"

const EVENT_ID = "11111111-1111-4111-8111-111111111111"

const input: ConsumeQcRunInput = {
  userId: "user-1",
  organizationId: "org-1",
  source: "studio",
  refId: "iteration-1",
  pageNumber: 1,
  analysisType: "spelling",
}

function fakeSupabase() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "consume_qc_run") return { data: { allowed: true, event_id: EVENT_ID }, error: null }
    if (name === "refund_qc_run") return { data: true, error: null }
    throw new Error(`unexpected rpc ${name}`)
  })
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

const refundCalls = (rpc: ReturnType<typeof vi.fn>) =>
  rpc.mock.calls.filter(([name]) => name === "refund_qc_run")

describe("withQcRun", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("keeps the run when the check succeeds", async () => {
    const { client, rpc } = fakeSupabase()

    const result = await withQcRun(client, input, async (markSaved) => {
      markSaved()
      return "results"
    })

    expect(result).toBe("results")
    expect(refundCalls(rpc)).toHaveLength(0)
  })

  it("refunds the run when the check fails before its results are saved", async () => {
    const { client, rpc } = fakeSupabase()

    await expect(
      withQcRun(client, input, async () => {
        throw new Error("inference server timed out")
      })
    ).rejects.toThrow("inference server timed out")

    expect(refundCalls(rpc)).toEqual([["refund_qc_run", { p_event_id: EVENT_ID }]])
  })

  // Regression (bug #6): a failure after saving (e.g. reloading the saved
  // suggestions) used to refund a run whose results were already stored.
  it("does not refund once the results are saved, even if a later step fails", async () => {
    const { client, rpc } = fakeSupabase()

    await expect(
      withQcRun(client, input, async (markSaved) => {
        markSaved()
        throw new Error("failed to reload suggestions")
      })
    ).rejects.toThrow("failed to reload suggestions")

    expect(refundCalls(rpc)).toHaveLength(0)
  })
})
