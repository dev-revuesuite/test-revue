"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { requestCreativePreview } from "@/lib/request-creative-preview"

/** A grid can hold dozens of PDFs; render them a couple at a time. */
const MAX_CONCURRENT = 2

/**
 * Creatives that can never produce a preview -- oversized, not really a PDF,
 * not permitted. Module scope, so the answer survives remounts and navigation
 * between folders. Without this, every visit re-requests a render that is
 * guaranteed to fail.
 */
const permanentlySkipped = new Set<string>()

/** In-flight or completed this page load; prevents duplicate concurrent requests. */
const alreadyAttempted = new Set<string>()

/**
 * Backfills previews for creatives uploaded before `preview_url` existed.
 *
 * New uploads render their preview at upload time. Older PDFs have nothing, so
 * the first team member to view them generates it. A single refresh at the end
 * picks up whatever landed.
 */
export function usePreviewBackfill(creativeIdsMissingPreview: string[]) {
  const router = useRouter()

  // Depend on contents, not array identity -- the caller rebuilds it each render.
  const key = creativeIdsMissingPreview.join(",")

  useEffect(() => {
    const queue = creativeIdsMissingPreview.filter(
      (id) => !alreadyAttempted.has(id) && !permanentlySkipped.has(id)
    )
    if (queue.length === 0) return

    queue.forEach((id) => alreadyAttempted.add(id))

    let cancelled = false

    const runWorker = async () => {
      let generatedAny = false
      while (queue.length > 0 && !cancelled) {
        const id = queue.shift()
        if (!id) break

        const { previewUrl, retryable } = await requestCreativePreview(id)

        if (previewUrl) {
          generatedAny = true
        } else if (!retryable) {
          permanentlySkipped.add(id)
        } else {
          // Transient failure: allow a later visit to try again.
          alreadyAttempted.delete(id)
        }
      }
      return generatedAny
    }

    const workerCount = Math.min(MAX_CONCURRENT, queue.length)

    void Promise.all(Array.from({ length: workerCount }, runWorker)).then(
      (results) => {
        if (!cancelled && results.some(Boolean)) router.refresh()
      }
    )

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, router])
}
