"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  Clock,
  FileText,
  FolderOpen,
  Image,
  Loader2,
  Search,
  UserPlus,
  Users,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGlobalSearch } from "@/hooks/use-global-search"
import {
  addRecentSearch,
  getRecentSearches,
} from "@/lib/global-search-recent"
import { cn } from "@/lib/utils"
import type {
  GlobalSearchCategory,
  GlobalSearchRecentItem,
  GlobalSearchResult,
  GlobalSearchResultType,
} from "@/types/global-search"

const searchCategories: {
  id: GlobalSearchCategory
  label: string
  icon: typeof FolderOpen
}[] = [
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "assets", label: "Assets", icon: Image },
  { id: "team", label: "Team Members", icon: UserPlus },
]

function resultIcon(type: GlobalSearchResultType) {
  switch (type) {
    case "client":
      return Building2
    case "creative":
      return Image
    case "reference":
      return FileText
    case "team":
      return UserPlus
    default:
      return FolderOpen
  }
}

function resultTypeLabel(type: GlobalSearchResultType): string {
  switch (type) {
    case "client":
      return "Client"
    case "creative":
      return "Creative"
    case "reference":
      return "Reference"
    case "team":
      return "Team member"
    default:
      return "Project"
  }
}

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const router = useRouter()
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedCategory, setSelectedCategory] =
    React.useState<GlobalSearchCategory>("projects")
  const [recentSearches, setRecentSearches] = React.useState<
    GlobalSearchRecentItem[]
  >([])
  const [activeIndex, setActiveIndex] = React.useState(0)

  const { results, loading, error } = useGlobalSearch({
    query: searchValue,
    category: selectedCategory,
    enabled: open,
  })

  const visibleItems = searchValue.trim()
    ? results
    : recentSearches

  React.useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setActiveIndex(0)
      window.setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearchValue("")
      setSelectedCategory("projects")
      setActiveIndex(0)
    }
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [searchValue, selectedCategory, results.length, recentSearches.length])

  const navigateToResult = React.useCallback(
    (result: GlobalSearchResult | GlobalSearchRecentItem) => {
      addRecentSearch(result)
      setRecentSearches(getRecentSearches())
      onOpenChange(false)
      router.push(result.href)
    },
    [onOpenChange, router]
  )

  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveIndex((current) =>
          visibleItems.length === 0
            ? 0
            : Math.min(current + 1, visibleItems.length - 1)
        )
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === "Enter" && visibleItems[activeIndex]) {
        event.preventDefault()
        navigateToResult(visibleItems[activeIndex]!)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeIndex, navigateToResult, open, visibleItems])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[80vw] p-0 gap-0 overflow-hidden rounded-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for projects, clients, assets, and team members
        </DialogDescription>

        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#e6e6e6] dark:border-[#333]">
          <Search className="w-5 h-5 text-[#7a7a7a] dark:text-[#999] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type to search..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-[#7a7a7a] dark:placeholder:text-[#999] text-[#1a1a1a] dark:text-white"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#7a7a7a] dark:text-[#999]" />
          ) : (
            <kbd className="px-2 py-1 bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded text-xs text-[#7a7a7a] dark:text-[#999] border border-[#e0e0e0] dark:border-[#444]">
              ESC
            </kbd>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[#e6e6e6] dark:border-[#333] bg-[#fafafa] dark:bg-[#1a1a1a]">
          <span className="text-xs text-[#7a7a7a] dark:text-[#999] mr-2">
            Search in:
          </span>
          {searchCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedCategory === category.id
                  ? "bg-[#5C6ECD] text-white"
                  : "text-[#7a7a7a] dark:text-[#999] hover:bg-[#e6e6e6] dark:hover:bg-[#333] hover:text-[#1a1a1a] dark:hover:text-white"
              )}
            >
              <category.icon className="w-3.5 h-3.5" />
              {category.label}
            </button>
          ))}
        </div>

        <div className="max-h-72 overflow-auto scrollbar-hide">
          {searchValue.trim() ? (
            <div className="p-5">
              <div className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-3">
                Results in{" "}
                {searchCategories.find((category) => category.id === selectedCategory)
                  ?.label}
              </div>

              {error ? (
                <div className="text-center py-10 text-red-500 text-sm">{error}</div>
              ) : loading && results.length === 0 ? (
                <div className="text-center py-10 text-[#7a7a7a] dark:text-[#999]">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-60" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 text-[#7a7a7a] dark:text-[#999]">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No results found for &quot;{searchValue}&quot;</p>
                  <p className="text-xs mt-1 opacity-70">Try different keywords</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((result, index) => {
                    const Icon = resultIcon(result.type)
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => navigateToResult(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors group",
                          activeIndex === index
                            ? "bg-[#f5f5f5] dark:bg-[#2a2a2a]"
                            : "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#f0f0f0] dark:bg-[#333] flex items-center justify-center">
                          <Icon className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">
                            {result.title}
                          </p>
                          <p className="text-[11px] text-[#7a7a7a] dark:text-[#999] truncate">
                            {result.subtitle || resultTypeLabel(result.type)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#7a7a7a] dark:text-[#999] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5">
              <div className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.length === 0 ? (
                <div className="text-center py-10 text-[#7a7a7a] dark:text-[#999]">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent searches yet</p>
                  <p className="text-xs mt-1 opacity-70">
                    Start typing to search your workspace
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentSearches.map((item, index) => {
                    const Icon = resultIcon(item.type)
                    return (
                      <button
                        key={`${item.type}-${item.id}-${item.searchedAt}`}
                        type="button"
                        onClick={() => navigateToResult(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors group",
                          activeIndex === index
                            ? "bg-[#f5f5f5] dark:bg-[#2a2a2a]"
                            : "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#f0f0f0] dark:bg-[#333] flex items-center justify-center">
                          <Icon className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#7a7a7a] dark:text-[#999] capitalize truncate">
                            {item.subtitle || resultTypeLabel(item.type)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#7a7a7a] dark:text-[#999] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useGlobalSearchShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpen])
}
