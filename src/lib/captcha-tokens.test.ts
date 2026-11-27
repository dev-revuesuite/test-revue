import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CaptchaTimeoutError, CaptchaTokens } from "@/lib/captcha-tokens"

describe("CaptchaTokens", () => {
  let resets: number
  let tokens: CaptchaTokens

  beforeEach(() => {
    vi.useFakeTimers()
    resets = 0
    tokens = new CaptchaTokens(() => resets++)
  })
  afterEach(() => vi.useRealTimers())

  it("gives a ready token straight away, once", async () => {
    tokens.issue("t1")
    await expect(tokens.take(1000)).resolves.toBe("t1")
    expect(resets).toBe(0)

    // The second request needs a new token: the widget is reset and we wait.
    const next = tokens.take(1000)
    expect(resets).toBe(1)
    tokens.issue("t2")
    await expect(next).resolves.toBe("t2")
  })

  it("waits for the first token when the widget is still loading", async () => {
    const pending = tokens.take(1000)
    tokens.issue("t1")
    await expect(pending).resolves.toBe("t1")
    expect(resets).toBe(0)
  })

  it("never gives out an expired token", async () => {
    tokens.issue("old")
    tokens.clear()
    const pending = tokens.take(1000)
    tokens.issue("fresh")
    await expect(pending).resolves.toBe("fresh")
  })

  it("gives up after the wait, and a later token is kept for the next request", async () => {
    const pending = tokens.take(1000)
    vi.advanceTimersByTime(1000)
    await expect(pending).rejects.toBeInstanceOf(CaptchaTimeoutError)

    tokens.issue("late")
    await expect(tokens.take(1000)).resolves.toBe("late")
  })

  it("gets a separate token for each of two waiting requests", async () => {
    const first = tokens.take(1000)
    const second = tokens.take(1000)
    tokens.issue("t1")
    expect(resets).toBe(1)
    tokens.issue("t2")
    await expect(first).resolves.toBe("t1")
    await expect(second).resolves.toBe("t2")
  })
})
