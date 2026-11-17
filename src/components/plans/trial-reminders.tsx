"use client"

import * as React from "react"
import { Clock, X } from "lucide-react"

import { RequestUpgradeButton } from "@/components/plans/request-upgrade-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/contexts/permission-context"
import { hasAnyPermission } from "@/lib/permissions"
import { useTrial } from "@/contexts/plan-features-context"
import { cn } from "@/lib/utils"

/** Days left at which the pop-up and the reminder bar start showing. */
const REMIND_FROM_DAYS = 3

function readFlag(storage: "local" | "session", key: string): boolean {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage
    return store.getItem(key) === "1"
  } catch {
    return false
  }
}

function writeFlag(storage: "local" | "session", key: string): void {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage
    store.setItem(key, "1")
  } catch {
    // Storage blocked (private mode etc.): the reminder just shows again.
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysText(days: number): string {
  if (days <= 0) return "today"
  return days === 1 ? "in 1 day" : `in ${days} days`
}

/**
 * Trial reminders for the organization's team (mounted once in the app layout):
 * - last 3 days: a pop-up once per day, and a small reminder bar;
 * - after the trial: an "upgrade" screen once per browser session, and the bar.
 * Client reviewers see nothing here.
 */
export function TrialReminders() {
  const trial = useTrial()
  const { isOrgOwner, permissions } = usePermissions()
  const isTeam = hasAnyPermission(permissions, isOrgOwner)

  const expired = trial.status === "expired"
  const endingSoon =
    trial.status === "trial" && trial.daysLeft !== null && trial.daysLeft <= REMIND_FROM_DAYS
  const active = isTeam && (expired || endingSoon)

  // Keys include the end date so an extended trial reminds again.
  const scope = trial.endsAt ?? "none"
  const popupKey = expired
    ? `revue:trial-ended-screen:${scope}`
    : `revue:trial-popup:${scope}:${today()}`
  const barKey = `revue:trial-bar:${scope}:${today()}`

  const [popupOpen, setPopupOpen] = React.useState(false)
  const [barVisible, setBarVisible] = React.useState(false)

  // Storage is only readable in the browser, so decide after mount.
  React.useEffect(() => {
    if (!active) return
    const storage = expired ? "session" : "local"
    /* eslint-disable react-hooks/set-state-in-effect -- reads browser storage once after mount */
    if (!readFlag(storage, popupKey)) {
      setPopupOpen(true)
      writeFlag(storage, popupKey)
    }
    setBarVisible(!readFlag("local", barKey))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, expired, popupKey, barKey])

  if (!active) return null

  const title = expired ? "Your free trial has ended" : `Your free trial ends ${daysText(trial.daysLeft ?? 0)}`
  const body = expired
    ? "Your work is safe and you can still view everything. To upload, run quality checks, comment or start new briefs, upgrade your plan."
    : "Upgrade before it ends to keep uploading, running quality checks and working with clients without interruption."

  return (
    <>
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div
              className={cn(
                "mb-2 flex h-10 w-10 items-center justify-center rounded-xl",
                expired ? "bg-destructive/10" : "bg-amber-100 dark:bg-amber-500/15"
              )}
            >
              <Clock className={cn("h-5 w-5", expired ? "text-destructive" : "text-amber-600")} />
            </div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setPopupOpen(false)}>
              {expired ? "Keep viewing" : "Remind me later"}
            </Button>
            <RequestUpgradeButton />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {barVisible && !popupOpen && (
        <div
          role="status"
          className={cn(
            "fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-lg",
            expired
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-950 dark:text-red-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-100"
          )}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {expired ? "Free trial ended. View only." : `Free trial ends ${daysText(trial.daysLeft ?? 0)}.`}
          </span>
          <RequestUpgradeButton size="sm" />
          <button
            type="button"
            aria-label="Dismiss for today"
            className="rounded-md p-1 opacity-70 transition hover:opacity-100"
            onClick={() => {
              writeFlag("local", barKey)
              setBarVisible(false)
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
