import { Loader2 } from "lucide-react"

/** Shared “file is opening” state between upload navigation and the canvas. */
export function QuickAnalysisOpening({
  label = "Opening...",
  className = "fixed inset-0 z-[80]",
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={`${className} flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
