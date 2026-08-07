"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { useAiAnalysisListener } from "@/contexts/ai-analysis-context"
import { APP_BASE_PATH } from "@/lib/base-path"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"
import { cn } from "@/lib/utils"

const ANALYSIS_TYPE_LABELS: Record<PersistedAiAnalysisType, string> = {
  lineheight: "Line height check",
  spacing: "Spacing analysis",
  spelling: "Text & spelling",
}

function stripBasePath(pathname: string): string {
  if (!APP_BASE_PATH) return pathname
  if (pathname === APP_BASE_PATH) return "/"
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return pathname.slice(APP_BASE_PATH.length) || "/"
  }
  return pathname
}

/**
 * Global toast when an analysis finishes and the user is not already viewing
 * that creative in Revue (tray + live merge cover the on-page case).
 */
export function AnalysisCompletionToast() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(message)
    timerRef.current = setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const creativeIdRef = useRef(searchParams.get("creativeId"))
  creativeIdRef.current = searchParams.get("creativeId")

  useAiAnalysisListener((event) => {
    if (event.type !== "complete" && event.type !== "empty") return

    const route = stripBasePath(pathnameRef.current)
    const onRevue = route === "/revue"
    const viewingThisCreative =
      onRevue && creativeIdRef.current === event.job.creativeId

    // On that creative: canvas merge + tray are enough — don't double-notify.
    if (viewingThisCreative) return

    const label = ANALYSIS_TYPE_LABELS[event.job.analysisType]
    const detail =
      event.type === "empty"
        ? "no issues found"
        : `${event.job.suggestions.length} suggestion${
            event.job.suggestions.length === 1 ? "" : "s"
          }`

    showToast(`${label} ready for ${event.job.creativeName} (${detail})`)
  })

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
        )}
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        {toast}
      </div>
    </div>
  )
}
