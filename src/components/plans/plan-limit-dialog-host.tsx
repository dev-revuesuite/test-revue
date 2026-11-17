"use client"

import * as React from "react"
import { Clock, HardDrive } from "lucide-react"

import { RequestUpgradeButton } from "@/components/plans/request-upgrade-button"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/contexts/permission-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  LOGO_TOO_LARGE_CODE,
  STORAGE_NOT_CONFIGURED_CODE,
} from "@/lib/storage-upload-types"
import { hasAnyPermission } from "@/lib/permissions"
import { TRIAL_EXPIRED_CODE } from "@/lib/plans"
import { PLAN_LIMIT_EVENT, type PlanLimitEventDetail } from "@/lib/upload-with-quota"

function titleFor(code: string): string {
  if (code === TRIAL_EXPIRED_CODE) return "Your free trial has ended"
  if (code === STORAGE_NOT_CONFIGURED_CODE) return "Storage isn't set up"
  if (code === LOGO_TOO_LARGE_CODE) return "Logo is too large"
  return "Storage full"
}

const CLIENT_TRIAL_MESSAGE =
  "This workspace is view-only right now. Ask the team that invited you to upgrade their plan."

/** One dialog for every action the plan refuses (mounted once in the app layout). */
export function PlanLimitDialogHost() {
  const [notice, setNotice] = React.useState<PlanLimitEventDetail | null>(null)
  const { isOrgOwner, permissions } = usePermissions()
  const isTeam = hasAnyPermission(permissions, isOrgOwner)
  const isTrial = notice?.code === TRIAL_EXPIRED_CODE
  const message = isTrial && !isTeam ? CLIENT_TRIAL_MESSAGE : notice?.message

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PlanLimitEventDetail>).detail
      if (detail?.message) setNotice(detail)
    }
    window.addEventListener(PLAN_LIMIT_EVENT, handler)
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, handler)
  }, [])

  return (
    <Dialog
      open={notice !== null}
      onOpenChange={(open) => {
        if (!open) setNotice(null)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            {isTrial ? (
              <Clock className="h-5 w-5 text-destructive" />
            ) : (
              <HardDrive className="h-5 w-5 text-destructive" />
            )}
          </div>
          <DialogTitle>
            {isTrial && !isTeam ? "Workspace is view-only" : notice ? titleFor(notice.code) : ""}
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          {isTrial && isTeam ? (
            <>
              <Button variant="ghost" onClick={() => setNotice(null)}>
                Keep viewing
              </Button>
              <RequestUpgradeButton />
            </>
          ) : (
            <Button onClick={() => setNotice(null)}>Got it</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
