import type { GlobalSearchRecentItem, GlobalSearchResult } from "@/types/global-search"

const STORAGE_KEY = "revue:global-search-recent"
const MAX_RECENT = 8

function readRecent(): GlobalSearchRecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GlobalSearchRecentItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecent(items: GlobalSearchRecentItem[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)))
}

export function getRecentSearches(): GlobalSearchRecentItem[] {
  return readRecent().sort((a, b) => b.searchedAt - a.searchedAt)
}

export function addRecentSearch(result: GlobalSearchResult): void {
  const item: GlobalSearchRecentItem = {
    id: result.id,
    type: result.type,
    category: result.category,
    title: result.title,
    subtitle: result.subtitle,
    href: result.href,
    searchedAt: Date.now(),
  }

  const deduped = readRecent().filter(
    (existing) => existing.id !== item.id || existing.href !== item.href
  )
  writeRecent([item, ...deduped])
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
