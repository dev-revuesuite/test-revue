"use client"

import { Gauge } from "lucide-react"

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
import { useTrial } from "@/contexts/plan-features-context"
import { planEndedCopy } from "@/lib/plan-ended-copy"
import {
  QC_LIMIT_REACHED_CODE,
  QC_NOT_CONFIGURED_CODE,
  TRIAL_EXPIRED_CODE,
} from "@/lib/plans"

/** Error codes that open this dialog instead of a toast. */
export function isQcPlanBlockCode(code: string | undefined): boolean {
  return (
    code === QC_LIMIT_REACHED_CODE ||
    code === QC_NOT_CONFIGURED_CODE ||
    code === TRIAL_EXPIRED_CODE
  )
}

export interface QcPlanBlock {
  code: string
  message: string
}

interface QcLimitDialogProps {
  /** The dialog is open while this is set. */
  block: QcPlanBlock | null
  onClose: () => void
}

/** Shown when a QC check is blocked by the plan (runs used up, or not set up). */
export function QcLimitDialog({ block, onClose }: QcLimitDialogProps) {
  useCloseWhenUpgradeOpens(() => {
    if (block) onClose()
  })
  // A former paying customer reads "Your plan has ended", not "free trial".
  const ended = planEndedCopy(useTrial().lapsed)
  const isEnded = block?.code === TRIAL_EXPIRED_CODE
  const title =
    isEnded
      ? ended.title
      : block?.code === QC_NOT_CONFIGURED_CODE
        ? "QC runs aren't set up"
        : "You're out of QC runs"

  return (
    <Dialog
      open={block !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Gauge className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{isEnded ? ended.message : block?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          {block?.code === TRIAL_EXPIRED_CODE ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Keep viewing
              </Button>
              <RequestUpgradeButton />
            </>
          ) : (
            <Button onClick={onClose}>Got it</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
