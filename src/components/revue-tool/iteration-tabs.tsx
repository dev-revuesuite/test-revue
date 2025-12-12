"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Iteration } from "@/types/revue-tool"

interface IterationTabsProps {
  iterations: Iteration[]
  activeIterationId: string | null
  onIterationChange: (iterationId: string) => void
}

export function IterationTabs({
  iterations,
  activeIterationId,
  onIterationChange,
}: IterationTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -150, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 150, behavior: "smooth" })
    }
  }

  // Sort iterations by number descending (newest first)
  const sortedIterations = [...iterations].sort(
    (a, b) => b.iteration_number - a.iteration_number
  )

  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-background border-b border-border">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 bg-[#334AC0] text-white hover:bg-[#2a3da3] hover:text-white border-none"
        onClick={scrollLeft}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sortedIterations.map((iteration) => (
          <button
            key={iteration.id}
            onClick={() => onIterationChange(iteration.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeIterationId === iteration.id
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            Iteration {iteration.iteration_number}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="shrink-0 bg-[#334AC0] text-white hover:bg-[#2a3da3] hover:text-white border-none"
        onClick={scrollRight}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
