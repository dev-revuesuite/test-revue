"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const GENERIC_STEPS = [
  "Capturing the creative",
  "Reading layout and text",
  "Checking design rules",
  "Preparing suggestions",
] as const

/** Cumulative reveal times (ms). The last step keeps spinning until unmount. */
const REVEAL_AT = [600, 1600, 3400, 6400]

/**
 * Live analysis trace, bound to the real job lifecycle: the parent mounts it
 * while an analysis is running and unmounts it when the job settles, so this
 * component never claims to be done on its own. Internal timers only pace the
 * step reveal; the final step spins until unmount.
 */
export function ThinkingState() {
  const [visible, setVisible] = useState(0)
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const expanded = manualExpanded ?? true
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timers = REVEAL_AT.map((at, index) =>
      window.setTimeout(() => setVisible(index + 1), at)
    )
    const tick = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(tick)
    }
  }, [])

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? true))}
        className="flex w-fit items-center gap-2 py-1 text-left"
      >
        <Sparkles
          className="h-4 w-4 shrink-0 text-purple-500 dark:text-purple-400"
          aria-hidden
        />
        <span
          role="status"
          className="text-sm font-medium text-gray-800 dark:text-white"
        >
          Thinking
        </span>
        {elapsed >= 3 && (
          <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {elapsed}s
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-gray-500",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 flex flex-col gap-1 border-l border-gray-200 pl-3 dark:border-[#444]">
            {GENERIC_STEPS.slice(0, visible).map((label, index) => {
              const isCurrent = index === visible - 1
              return (
                <div key={label} className="flex min-h-7 items-center gap-2">
                  {isCurrent ? (
                    <Loader2
                      className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-500 motion-reduce:animate-none dark:text-purple-400"
                      aria-hidden
                    />
                  ) : (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "truncate text-xs",
                      isCurrent
                        ? "font-medium text-gray-800 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
