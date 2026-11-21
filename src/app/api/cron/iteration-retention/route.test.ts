import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const jobs = vi.hoisted(() => ({
  retention: vi.fn(),
  storageCleanup: vi.fn(),
  trialReminders: vi.fn(),
  billing: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
  isAdminClientConfigured: () => true,
}))
vi.mock("@/lib/iteration-retention-service", () => ({ runIterationRetention: jobs.retention }))
vi.mock("@/lib/storage-reservation-cleanup", () => ({ runStorageReservationCleanup: jobs.storageCleanup }))
vi.mock("@/lib/trial-reminder-service", () => ({ runTrialReminders: jobs.trialReminders }))
vi.mock("@/lib/billing/daily-billing", () => ({ runDailyBilling: jobs.billing }))

import { GET } from "./route"

const SECRET = "test-cron-secret"
const request = () =>
  new Request("http://localhost/qc-tool/api/cron/iteration-retention", {
    headers: { authorization: `Bearer ${SECRET}` },
  })

const retentionResult = { candidates: 0, warned: [], deleted: [], cleared: 0, failed: [] }

describe("daily cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET)
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
    jobs.retention.mockReset().mockResolvedValue(retentionResult)
    jobs.storageCleanup.mockReset().mockResolvedValue({ checked: 0 })
    jobs.trialReminders.mockReset().mockResolvedValue({ sent: 2 })
    jobs.billing.mockReset().mockResolvedValue({ checked: 1, revoked: 0 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("runs all four jobs when everything works", async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      candidates: 0,
      storageCleanup: { checked: 0 },
      trialReminders: { sent: 2 },
      billing: { checked: 1, revoked: 0 },
    })
  })

  // Regression (bug #2): a retention failure used to skip the other jobs.
  it("still runs storage cleanup and trial reminders when retention fails", async () => {
    jobs.retention.mockRejectedValue(new Error("database hiccup"))

    const response = await GET(request())

    expect(jobs.storageCleanup).toHaveBeenCalledOnce()
    expect(jobs.trialReminders).toHaveBeenCalledOnce()
    expect(jobs.billing).toHaveBeenCalledOnce()
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "Retention run failed",
      storageCleanup: { checked: 0 },
      trialReminders: { sent: 2 },
      billing: { checked: 1, revoked: 0 },
    })
  })

  it("still sends trial reminders when storage cleanup fails", async () => {
    jobs.storageCleanup.mockRejectedValue(new Error("storage down"))

    const response = await GET(request())

    expect(jobs.trialReminders).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      storageCleanup: { error: "Storage cleanup failed" },
      trialReminders: { sent: 2 },
    })
  })

  it("still runs the billing check when trial reminders fail, and vice versa", async () => {
    jobs.trialReminders.mockRejectedValue(new Error("mail down"))
    jobs.billing.mockRejectedValueOnce(new Error("razorpay down"))

    const response = await GET(request())

    expect(jobs.billing).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      trialReminders: { error: "Trial reminders failed" },
      billing: { error: "Billing reconcile failed" },
    })
  })

  it("passes dry run to the billing check", async () => {
    await GET(new Request("http://localhost/qc-tool/api/cron/iteration-retention?dryRun=1", { headers: { authorization: `Bearer ${SECRET}` } }))
    expect(jobs.billing).toHaveBeenCalledWith(expect.anything(), { dryRun: true })
  })

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("http://localhost/qc-tool/api/cron/iteration-retention"))

    expect(response.status).toBe(401)
    expect(jobs.retention).not.toHaveBeenCalled()
  })
})
