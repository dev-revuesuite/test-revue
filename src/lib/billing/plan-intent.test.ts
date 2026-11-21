import { describe, expect, it } from "vitest"

import { clearPlanIntent, parsePlanIntent, readPlanIntent, savePlanIntent } from "@/lib/billing/plan-intent"

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error("blocked")
  },
  setItem: () => {
    throw new Error("blocked")
  },
  removeItem: () => {
    throw new Error("blocked")
  },
}

describe("parsePlanIntent", () => {
  it.each([
    ["?plan=plus&cycle=monthly", { plan: "plus", cycle: "monthly" }],
    ["?plan=plus&cycle=annual", { plan: "plus", cycle: "annual" }],
    ["?plan=business&cycle=monthly", { plan: "business", cycle: "monthly" }],
    ["?plan=business", { plan: "business", cycle: "monthly" }],
    ["?plan=business&cycle=weekly", { plan: "business", cycle: "monthly" }],
  ])("reads %s", (query, expected) => {
    expect(parsePlanIntent(new URLSearchParams(query))).toEqual(expected)
  })

  it.each([
    "",
    "?plan=free",
    "?plan=enterprise",
    "?plan=PLUS",
    "?plan=plus%20",
    "?plan=__proto__",
    "?cycle=annual",
    "?plan=plus&plan=business",
  ])("ignores %s", (query) => {
    expect(parsePlanIntent(new URLSearchParams(query))).toBeNull()
  })

  it("never carries a price or anything else from the link", () => {
    expect(parsePlanIntent(new URLSearchParams("?plan=plus&cycle=monthly&amount=1&plan_id=plan_x"))).toEqual({
      plan: "plus",
      cycle: "monthly",
    })
  })
})

describe("saved plan intent", () => {
  const NOW = 1_800_000_000_000

  it("remembers a choice and reads it back", () => {
    const storage = memoryStorage()
    savePlanIntent({ plan: "business", cycle: "annual" }, storage, NOW)
    expect(readPlanIntent(storage, NOW + 60_000)).toEqual({ plan: "business", cycle: "annual" })
  })

  it("forgets it after 24 hours", () => {
    const storage = memoryStorage()
    savePlanIntent({ plan: "plus", cycle: "monthly" }, storage, NOW)
    expect(readPlanIntent(storage, NOW + 25 * 60 * 60 * 1000)).toBeNull()
  })

  it("clears it", () => {
    const storage = memoryStorage()
    savePlanIntent({ plan: "plus", cycle: "monthly" }, storage, NOW)
    clearPlanIntent(storage)
    expect(readPlanIntent(storage, NOW)).toBeNull()
  })

  it.each([
    ["garbage", "not json"],
    ["a tampered plan", JSON.stringify({ plan: "enterprise", cycle: "monthly", savedAt: NOW })],
    ["a missing time", JSON.stringify({ plan: "plus", cycle: "monthly" })],
    ["a future time", JSON.stringify({ plan: "plus", cycle: "monthly", savedAt: NOW + 10 * 60 * 60 * 1000 })],
  ])("ignores %s in storage", (_label, raw) => {
    const storage = memoryStorage()
    storage.setItem("revue:plan-intent", raw)
    expect(readPlanIntent(storage, NOW)).toBeNull()
  })

  it("works (as 'no choice') when storage is blocked", () => {
    expect(() => savePlanIntent({ plan: "plus", cycle: "monthly" }, throwingStorage, NOW)).not.toThrow()
    expect(readPlanIntent(throwingStorage, NOW)).toBeNull()
    expect(() => clearPlanIntent(throwingStorage)).not.toThrow()
  })
})
