"use client"

import * as React from "react"

import { usePermissions } from "@/contexts/permission-context"
import { hasAnyPermission } from "@/lib/permissions"
import { useTrial } from "@/contexts/plan-features-context"
import { planEndedCopy } from "@/lib/plan-ended-copy"
import { cn } from "@/lib/utils"

function trialLabel(daysLeft: number | null): string {
  if (daysLeft === null) return "Free trial"
  return `Free trial · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
}

/**
 * Wraps the profile photo: a green ring and a "Free trial" pill during the
 * trial, a red ring and "Trial ended" after it. Shown to the organization's
 * team only (not to client reviewers). Paid and older organizations: unchanged.
 */
export function TrialAvatarBadge({ children }: { children: React.ReactNode }) {
  const trial = useTrial()
  const { isOrgOwner, permissions } = usePermissions()
  const isTeam = hasAnyPermission(permissions, isOrgOwner)

  if (!isTeam || (trial.status !== "trial" && trial.status !== "expired")) {
    return <>{children}</>
  }

  const expired = trial.status === "expired"
  const endedBadge = planEndedCopy(trial.lapsed).badge
  const label = expired ? endedBadge : trialLabel(trial.daysLeft)

  return (
    <span className="relative inline-flex" title={label}>
      <span
        className={cn(
          // The headers give the avatar a grey ring; hide it so this ring shows.
          "inline-flex rounded-full p-[2px] [&_[data-slot=avatar]]:ring-0",
          expired ? "bg-red-500" : "bg-emerald-500"
        )}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-semibold leading-tight shadow-sm",
          expired ? "bg-red-600 text-white" : "bg-amber-300 text-amber-950"
        )}
      >
        {expired ? endedBadge : "Free trial"}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
