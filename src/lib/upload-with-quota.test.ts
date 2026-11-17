import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StorageUploadFailedError, uploadWithQuota } from "@/lib/upload-with-quota"

const RESERVATION_ID = "22222222-2222-4222-8222-222222222222"

const grant = {
  mode: "signed",
  reservationId: RESERVATION_ID,
  bucket: "creatives",
  path: "creatives/project-1/banner.png",
  publicUrl: "https://example.test/banner.png",
  signedUrl: "https://storage.example.test/upload/sign/banner.png?token=t",
}

/** Minimal XMLHttpRequest that "uploads" successfully. */
class FakeXhr {
  status = 200
  upload = { addEventListener: () => {} }
  private listeners: Record<string, () => void> = {}
  addEventListener(type: string, fn: () => void) {
    this.listeners[type] = fn
  }
  open() {}
  setRequestHeader() {}
  abort() {}
  send() {
    queueMicrotask(() => this.listeners.load?.())
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

/** Routes the app's own API calls; `complete` answers with `completeResponse`. */
function stubApi(completeResponse: () => Response | Promise<Response>, discard?: () => Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/api/storage/uploads")) return json(200, grant)
    if (url.endsWith(`/${RESERVATION_ID}/complete`)) return completeResponse()
    if (url.endsWith(`/${RESERVATION_ID}/discard`)) return discard ? discard() : json(200, { ok: true })
    if (url.endsWith(`/${RESERVATION_ID}/cancel`)) return json(200, { ok: true })
    throw new Error(`unexpected fetch ${url}`)
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const calledPaths = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url]) => String(url).replace(/^.*\/api\//, "/api/"))

const upload = () =>
  uploadWithQuota({} as SupabaseClient, {
    category: "design",
    file: new File(["png"], "banner.png", { type: "image/png" }),
    target: { projectId: "project-1" },
  } as Parameters<typeof uploadWithQuota>[1])

describe("uploadWithQuota (signed upload)", () => {
  beforeEach(() => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the uploaded file when the upload is confirmed", async () => {
    const fetchMock = stubApi(() => json(200, { ok: true }))

    const result = await upload()

    expect(result.path).toBe(grant.path)
    expect(calledPaths(fetchMock)).not.toContain(`/api/storage/uploads/${RESERVATION_ID}/discard`)
  })

  // Regression (bug #4): a failed confirmation used to leave the file in
  // storage and its space reserved until the daily cleanup.
  it("discards the upload when the confirmation fails", async () => {
    const fetchMock = stubApi(() => json(409, { error: "The upload didn't finish.", code: "NOT_UPLOADED" }))

    const error = await upload().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(StorageUploadFailedError)
    expect((error as Error).message).toBe("The upload didn't finish.")
    expect(calledPaths(fetchMock)).toContain(`/api/storage/uploads/${RESERVATION_ID}/discard`)
  })

  it("still reports the original error when the discard itself fails", async () => {
    stubApi(
      () => json(500, { error: "Couldn't confirm the upload." }),
      () => Promise.reject(new TypeError("Failed to fetch"))
    )

    await expect(upload()).rejects.toThrow("Couldn't confirm the upload.")
  })
})
