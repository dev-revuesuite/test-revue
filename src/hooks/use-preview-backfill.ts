"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { requestCreativePreview } from "@/lib/request-creative-preview"

/** A grid can hold dozens of PDFs; render them a couple at a time. */
const MAX_CONCURRENT = 2

/**
 * Backfills previews for creatives uploaded before `preview_url` existed.
 *
 * New uploads render their preview at upload time. Older PDFs have nothing, so
 * the first team member to view them generates it. Each id is attempted at most
 * once per mount, and a single refresh at the end picks up whatever landed.
 */
export function usePreviewBackfill(creativeIdsMissingPreview: string[]) {
  const router = useRouter()
  const attempted = useRef(new Set<string>())

  // Depend on contents, not array identity -- the caller rebuilds it each render.
  const key = creativeIdsMissingPreview.join(",")

  useEffect(() => {
    const queue = creativeIdsMissingPreview.filter(
      (id) => !attempted.current.has(id)
    )
    if (queue.length === 0) return

    queue.forEach((id) => attempted.current.add(id))

    let cancelled = false

    const runWorker = async () => {
      let generatedAny = false
      while (queue.length > 0 && !cancelled) {
        const id = queue.shift()
        if (!id) break
        const previewUrl = await requestCreativePreview(id)
        if (previewUrl) generatedAny = true
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
