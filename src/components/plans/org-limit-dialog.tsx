"use client"

import { Building2 } from "lucide-react"

import { useCloseWhenUpgradeOpens } from "@/components/billing/upgrade-dialog-host"
import { RequestUpgradeButton } from "@/components/plans/request-upgrade-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** Shown instead of the new-organization form once the plan's organizations are used up. */
export function OrgLimitDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  useCloseWhenUpgradeOpens(() => onOpenChange(false))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
            <Building2 className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle>Upgrade to create more organizations</DialogTitle>
          <DialogDescription>
            You&apos;ve reached the number of organizations your plan includes (Free: 1, Plus: 5,
            Business: unlimited). One plan covers all your organizations.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <RequestUpgradeButton reason="More organizations (the free plan includes 1)" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
