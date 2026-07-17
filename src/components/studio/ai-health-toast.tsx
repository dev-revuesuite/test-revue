"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { apiPath } from "@/lib/base-path"
import { cn } from "@/lib/utils"

const TOAST_SESSION_KEY = "revue.aiMaintenanceToastShown"
const MAINTENANCE_MESSAGE = "Our AI is under scheduled maintenance."
const POLL_INTERVAL_MS = 60_000
const TOAST_AUTO_DISMISS_MS = 6_000
const HEALTH_CACHE_MS = 30_000
const INITIAL_CHECK_DELAY_MS = 1_500

type HealthCache = {
  value: boolean | null
  checkedAt: number
  inflight: Promise<boolean | null> | null
}

const healthCache: HealthCache = {
  value: null,
  checkedAt: 0,
  inflight: null,
}

async function fetchAiHealthy(signal?: AbortSignal): Promise<boolean | null> {
  const now = Date.now()
  if (
    healthCache.inflight == null &&
    now - healthCache.checkedAt < HEALTH_CACHE_MS &&
    healthCache.checkedAt > 0
  ) {
    return healthCache.value
  }

  if (healthCache.inflight) {
    return healthCache.inflight
  }

  const pending = (async () => {
    try {
      const response = await fetch(apiPath("/api/ai/health"), {
        method: "GET",
        cache: "no-store",
        signal,
      })
      if (!response.ok) return null

      const data: unknown = await response.json()
      if (!data || typeof data !== "object" || !("healthy" in data)) {
        return false
      }

      return (data as { healthy: unknown }).healthy === true
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null
      }
      return null
    } finally {
      healthCache.inflight = null
    }
  })()

  healthCache.inflight = pending
  const result = await pending
  if (result !== null) {
    healthCache.value = result
    healthCache.checkedAt = Date.now()
  }
  return result
}

function wasToastShown(): boolean {
  try {
    return sessionStorage.getItem(TOAST_SESSION_KEY) === "1"
  } catch {
    return false
  }
}

function markToastShown(): void {
  try {
    sessionStorage.setItem(TOAST_SESSION_KEY, "1")
  } catch {
    // Ignore storage failures.
  }
}

function clearToastShown(): void {
  try {
    sessionStorage.removeItem(TOAST_SESSION_KEY)
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Non-blocking AI availability check on /studio.
 * Deferred so it does not contend with login → studio bootstrap.
 */
export function AiHealthNotice() {
  const [bannerVisible, setBannerVisible] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  const applyHealth = useCallback((healthy: boolean | null) => {
    if (healthy === null) return

    if (healthy) {
      setBannerVisible(false)
      setToastVisible(false)
      clearToastShown()
      return
    }

    setBannerVisible(true)
    if (!wasToastShown()) {
      markToastShown()
      setToastVisible(true)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let intervalId: number | undefined

    const runCheck = async () => {
      const healthy = await fetchAiHealthy(controller.signal)
      if (!controller.signal.aborted) applyHealth(healthy)
    }

    const initialTimer = window.setTimeout(() => {
      void runCheck()
      intervalId = window.setInterval(() => {
        void runCheck()
      }, POLL_INTERVAL_MS)
    }, INITIAL_CHECK_DELAY_MS)

    return () => {
      controller.abort()
      window.clearTimeout(initialTimer)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [applyHealth])

  useEffect(() => {
    if (!toastVisible) return
    const timerId = window.setTimeout(
      () => setToastVisible(false),
      TOAST_AUTO_DISMISS_MS
    )
    return () => window.clearTimeout(timerId)
  }, [toastVisible])

  return (
    <>
      {bannerVisible && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 border-b px-4 py-2",
            "border-amber-200/80 bg-amber-50 text-amber-950",
            "dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          )}
          role="status"
          aria-live="polite"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-medium sm:text-sm">{MAINTENANCE_MESSAGE}</p>
        </div>
      )}

      {toastVisible && (
        <div
          className={cn(
            "fixed top-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2.5",
            "max-w-[min(92vw,28rem)] rounded-full bg-gray-900 dark:bg-white",
            "px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 shadow-xl",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
          role="status"
          aria-live="assertive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 dark:text-amber-600" />
          <span className="leading-snug">{MAINTENANCE_MESSAGE}</span>
          <button
            type="button"
            onClick={() => setToastVisible(false)}
            className="ml-0.5 shrink-0 rounded-full p-0.5 text-white/70 hover:text-white dark:text-gray-900/60 dark:hover:text-gray-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
