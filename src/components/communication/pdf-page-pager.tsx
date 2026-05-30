"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PdfPagePagerProps {
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function PdfPagePager({
  currentPage,
  pageCount,
  onPageChange,
  className,
}: PdfPagePagerProps) {
  if (pageCount <= 1) return null

  const safePage = Math.min(Math.max(1, currentPage), pageCount)

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full",
        "bg-white/95 dark:bg-[#2a2a2a]/95 shadow-lg border border-gray-200 dark:border-[#444]",
        "backdrop-blur-sm",
        className
      )}
      role="navigation"
      aria-label="PDF page navigation"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium text-gray-800 dark:text-white tabular-nums min-w-[7rem] text-center">
        Page {safePage} of {pageCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        disabled={safePage >= pageCount}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
