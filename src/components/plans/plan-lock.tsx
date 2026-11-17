import { Lock } from "lucide-react"

import { PLAN_LOCK_LABEL } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

/** "Available on Plus" badge shown on features the plan doesn't include. */
export function PlanLock({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      <Lock className="h-3 w-3" />
      {PLAN_LOCK_LABEL}
    </span>
  )
}
