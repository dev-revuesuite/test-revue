// Wording for a view-only workspace. Two cases look the same in the database
// (Free plan, trial over) but must read differently:
// - the free trial ran out and the owner never paid;
// - the owner paid before and the plan ended (cancelled, or payment failed).

export type PlanEndedCopy = {
  /** Dialog title. */
  title: string
  /** Replaces the server's generic "trial has ended" sentence in dialogs. */
  message: string
  /** Pop-up body for the team. */
  body: string
  /** Small reminder bar. */
  bar: string
  /** Plan tab line. */
  planTab: string
  /** Pill on the profile photo. */
  badge: string
}

const TRIAL_ENDED: PlanEndedCopy = {
  title: "Your free trial has ended",
  message: "Your free trial has ended. Your work is still here to view. Upgrade to keep working.",
  body: "Your work is safe and you can still view everything. To upload, run quality checks, comment or start new briefs, upgrade your plan.",
  bar: "Free trial ended. View only.",
  planTab: "Free trial ended. Your organization is view-only.",
  badge: "Trial ended",
}

const PLAN_ENDED: PlanEndedCopy = {
  title: "Your plan has ended",
  message: "Your plan has ended. Your work is still here to view. Subscribe again to keep working.",
  body: "Your work is safe and you can still view everything. To upload, run quality checks, comment or start new briefs, subscribe again.",
  bar: "Your plan has ended. View only.",
  planTab: "Your plan has ended. Your organization is view-only.",
  badge: "Plan ended",
}

/** `lapsed` = the owner paid before (OrgTrialInfo.lapsed). */
export function planEndedCopy(lapsed: boolean | undefined): PlanEndedCopy {
  return lapsed ? PLAN_ENDED : TRIAL_ENDED
}
