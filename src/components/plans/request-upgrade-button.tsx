"use client"

import { Sparkles } from "lucide-react"

import { openUpgradeDialog } from "@/components/billing/upgrade-dialog-host"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/contexts/permission-context"
import { useBillingContext } from "@/contexts/plan-features-context"
import { isBillingEnabled } from "@/lib/billing/plan-prices"
import { cn } from "@/lib/utils"

/**
 * Upgrade call-to-action.
 * - Billing not switched on (NEXT_PUBLIC_BILLING_ENABLED): "Upgrade coming soon", disabled.
 * - Organization owner: opens the plan picker (UpgradeDialogHost in the app layout).
 * - Everyone else: explains that only the owner can upgrade.
 * A dialog containing this button must call useCloseWhenUpgradeOpens() so it
 * gets out of the way of the plan picker and the payment window.
 */
export function RequestUpgradeButton({
  size = "default",
  className,
}: {
  size?: "default" | "sm"
  className?: string
  /** Why the user wants to upgrade (shown nowhere yet; kept for analytics). */
  reason?: string
}) {
  const { isOrgOwner } = usePermissions()
  const { organizationId } = useBillingContext()

  if (!isBillingEnabled() || !organizationId) {
    return (
      <Button size={size} disabled className={cn("disabled:opacity-70", className)}>
        <Sparkles className="h-4 w-4" />
        Upgrade coming soon
      </Button>
    )
  }

  if (!isOrgOwner) {
    return (
      <Button size={size} variant="outline" disabled className={cn("disabled:opacity-80", className)}>
        Ask your organization owner to upgrade
      </Button>
    )
  }

  return (
    <Button size={size} className={className} onClick={openUpgradeDialog}>
      <Sparkles className="h-4 w-4" />
      Upgrade
    </Button>
  )
}
