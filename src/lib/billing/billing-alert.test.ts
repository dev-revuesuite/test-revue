import { beforeEach, describe, expect, it, vi } from "vitest"

import { alertBillingProblem, describeBillingProblem } from "@/lib/billing/billing-alert"

const OK = { dryRun: false, checked: 3, applied: 3, abandonedCancelled: 0, owners: 2, revoked: 0, granted: 0, failed: 0, notices: 1, emailsSent: 1, emailsFailed: 0, addonsGranted: 0, addonsFailed: 0 }

describe("nightly billing alert", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("a clean run, or billing not being set up, is not a problem", () => {
    expect(describeBillingProblem(OK)).toBeNull()
    expect(describeBillingProblem({ skipped: "billing is not configured" })).toBeNull()
    expect(describeBillingProblem(null)).toBeNull()
  })

  it("a crashed run is a problem", () => {
    expect(describeBillingProblem({ error: "Billing reconcile failed" })).toHaveLength(1)
  })

  it("names each kind of failure", () => {
    const problems = describeBillingProblem({ ...OK, failed: 2, addonsFailed: 1, emailsFailed: 3 })
    expect(problems).toHaveLength(3)
    expect(problems?.[0]).toContain("2 subscription or owner check(s) failed")
  })

  it("emails the team only when there is a problem", async () => {
    const send = vi.fn(async (message: { to: string; subject: string; text: string }) => {
      void message
      return true
    })
    await expect(alertBillingProblem(OK, send)).resolves.toBe(false)
    expect(send).not.toHaveBeenCalled()

    await expect(alertBillingProblem({ ...OK, failed: 1 }, send)).resolves.toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].subject).toContain("billing")
    expect(send.mock.calls[0][0].text).toContain("1 subscription or owner check(s) failed")
  })

  it("never throws, even if sending fails", async () => {
    await expect(alertBillingProblem({ error: "boom" }, async () => { throw new Error("mail down") })).resolves.toBe(false)
  })
})
