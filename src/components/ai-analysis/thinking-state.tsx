"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "./thinking-state.module.css"

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
  const traceRef = useRef<HTMLDivElement>(null)
  const [lineHeight, setLineHeight] = useState(0)
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

  useLayoutEffect(() => {
    if (traceRef.current) {
      setLineHeight(traceRef.current.offsetHeight)
    }
  }, [visible, expanded])

  return (
    <div className={styles.root}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? true))}
        className={styles.headerButton}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="var(--ink-2)"
          className={styles.starIcon}
          aria-hidden
        >
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status" className="contents">
          <span className={styles.activeLabel}>Thinking</span>
        </span>
        {elapsed >= 3 && <span className={styles.elapsed}>{elapsed}s</span>}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(styles.chevron, expanded && styles.chevronExpanded)}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={cn(
          styles.traceShell,
          expanded ? styles.traceShellExpanded : styles.traceShellCollapsed
        )}
      >
        <div className={styles.traceOverflow}>
          <div className={styles.traceInner}>
            <span
              aria-hidden
              className={styles.traceLine}
              style={{ height: lineHeight ? lineHeight - 2 : 0 }}
            />
            <div ref={traceRef} className={styles.traceRows}>
              {GENERIC_STEPS.slice(0, visible).map((label, index) => {
                // Only completed steps get a check; the newest revealed step
                // spins until the next reveal (or unmount for the last one).
                const isCurrent = index === visible - 1
                return (
                  <div key={label} className={styles.row}>
                    {isCurrent ? (
                      <span className={styles.spinner} aria-hidden />
                    ) : (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    )}
                    <span className={styles.rowPrimary}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
