import { describe, expect, it } from "vitest"

import { readAllRows } from "@/lib/billing/daily-billing"
import { pickRelevantSubscription } from "@/lib/billing/relevant-subscription"

const row = (id: string, status: string, paid_until: string | null = null) => ({ id, status, paid_until })
const PAID = "2026-12-20T00:00:00.000Z"

describe("pickRelevantSubscription (rows newest first)", () => {
  it("an abandoned checkout doesn't hide the plan that is still paid for", () => {
    // Switch started (old plan cancelled, new checkout opened) and the payment window was closed.
    expect(pickRelevantSubscription([row("new", "created"), row("old", "cancelled", PAID)])?.id).toBe("old")
    // ...and two days later the nightly job cancelled that checkout.
    expect(pickRelevantSubscription([row("new", "cancelled"), row("old", "cancelled", PAID)])?.id).toBe("old")
  })

  it("a running or failing subscription wins over anything older or newer", () => {
    expect(pickRelevantSubscription([row("new", "created"), row("live", "active", PAID), row("old", "cancelled", PAID)])?.id).toBe("live")
    expect(pickRelevantSubscription([row("failing", "halted", PAID), row("old", "cancelled", PAID)])?.id).toBe("failing")
  })

  it("someone who only ever opened a checkout has no subscription", () => {
    expect(pickRelevantSubscription([row("a", "cancelled"), row("b", "expired"), row("c", "created")])).toBeNull()
    expect(pickRelevantSubscription([])).toBeNull()
  })

  it("after everything ended, the newest paid one is shown", () => {
    expect(pickRelevantSubscription([row("newer", "cancelled", PAID), row("older", "completed", PAID)])?.id).toBe("newer")
  })
})

describe("readAllRows (nightly check paging)", () => {
  const pages = (total: number) => async (from: number, to: number) => ({
    data: Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => ({ n: from + i })),
    error: null,
  })

  it("reads past the 1,000-row page limit", async () => {
    const rows = await readAllRows<{ n: number }>("test", pages(2500))
    expect(rows).toHaveLength(2500)
    expect(rows[2499].n).toBe(2499)
  })

  it("handles an exact multiple of the page size and an empty table", async () => {
    await expect(readAllRows("test", pages(2000))).resolves.toHaveLength(2000)
    await expect(readAllRows("test", pages(0))).resolves.toHaveLength(0)
  })

  it("stops with an error instead of returning part of the list", async () => {
    await expect(readAllRows("listing owners", async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow(
      "listing owners failed: boom",
    )
  })
})
