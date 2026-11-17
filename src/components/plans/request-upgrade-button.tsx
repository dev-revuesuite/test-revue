"use client"

import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Upgrade call-to-action. Paid plans aren't on sale yet (payments come later),
 * so it shows "Upgrade coming soon" and does nothing when clicked.
 */
export function RequestUpgradeButton({
  size = "default",
  className,
}: {
  size?: "default" | "sm"
  className?: string
  /** Why the user wants to upgrade. Kept for when upgrades go live. */
  reason?: string
}) {
  return (
    <Button size={size} disabled className={cn("disabled:opacity-70", className)}>
      <Sparkles className="h-4 w-4" />
      Upgrade coming soon
    </Button>
  )
}
