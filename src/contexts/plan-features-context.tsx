"use client"

import * as React from "react"

import { ALL_PLAN_FEATURES_INCLUDED, type PlanFeatures, type PlanFeatureKey } from "@/lib/plan-features"
import { NO_TRIAL, type OrgTrialInfo } from "@/lib/trial"
import { runIfWritable } from "@/lib/trial-guard"
import { showTrialExpiredDialog } from "@/lib/upload-with-quota"

const PlanFeaturesContext = React.createContext<PlanFeatures>(ALL_PLAN_FEATURES_INCLUDED)
const TrialContext = React.createContext<OrgTrialInfo>(NO_TRIAL)

export function PlanFeaturesProvider({
  features,
  trial = NO_TRIAL,
  children,
}: {
  features: PlanFeatures
  /** Active organization's free-trial status (loaded in the app layout). */
  trial?: OrgTrialInfo
  children: React.ReactNode
}) {
  return (
    <PlanFeaturesContext.Provider value={features}>
      <TrialContext.Provider value={trial}>{children}</TrialContext.Provider>
    </PlanFeaturesContext.Provider>
  )
}

/** Is this feature included in the active organization's plan? */
export function usePlanFeature(key: PlanFeatureKey): boolean {
  return React.useContext(PlanFeaturesContext)[key]
}

/** The active organization's free-trial status. */
export function useTrial(): OrgTrialInfo {
  return React.useContext(TrialContext)
}

/** True once the active organization's free trial has ended (view-only). */
export function useTrialExpired(): boolean {
  return React.useContext(TrialContext).status === "expired"
}

/**
 * Wraps an editing action: after the free trial ends it shows the upgrade
 * dialog instead of running the action.
 */
export function useWhenWritable(): (action: () => void) => () => void {
  const expired = useTrialExpired()
  return React.useCallback(
    (action: () => void) => () => {
      runIfWritable(expired, action, showTrialExpiredDialog)
    },
    [expired]
  )
}
