import { describe, expect, it, vi } from "vitest"

import { runIfWritable } from "@/lib/trial-guard"

describe("runIfWritable (trial view-only rule)", () => {
  it("runs the write during the trial or on a paid plan", () => {
    const write = vi.fn(() => "saved")
    const onBlocked = vi.fn()

    expect(runIfWritable(false, write, onBlocked)).toBe("saved")
    expect(write).toHaveBeenCalledOnce()
    expect(onBlocked).not.toHaveBeenCalled()
  })

  it("blocks the write and shows the upgrade dialog after the trial ends", () => {
    const write = vi.fn()
    const onBlocked = vi.fn()

    expect(runIfWritable(true, write, onBlocked)).toBeUndefined()
    expect(write).not.toHaveBeenCalled()
    expect(onBlocked).toHaveBeenCalledOnce()
  })

})
