"use client"

import { useEffect, useState } from "react"

import { apiPath } from "@/lib/base-path"
import type {
  GlobalSearchCategory,
  GlobalSearchResult,
} from "@/types/global-search"

interface UseGlobalSearchOptions {
  query: string
  category: GlobalSearchCategory
  enabled?: boolean
}

export function useGlobalSearch({
  query,
  category,
  enabled = true,
}: UseGlobalSearchOptions) {
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!enabled || trimmed.length < 1) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          q: trimmed,
          category,
        })
        const response = await fetch(`${apiPath("/api/search")}?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(payload?.error || `Search failed (${response.status})`)
        }

        const payload = (await response.json()) as {
          results?: GlobalSearchResult[]
        }
        setResults(payload.results || [])
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return
        }
        setResults([])
        setError(
          fetchError instanceof Error ? fetchError.message : "Search failed"
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [category, enabled, query])

  return { results, loading, error }
}
