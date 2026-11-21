export const PLAN_IDS = ["free", "plus", "business", "enterprise"] as const

/** Error `code` returned by the analyze routes when the QC allowance is used up. */
export const QC_LIMIT_REACHED_CODE = "QC_LIMIT_REACHED"
/** Error `code` when the plan has no QC allowance configured (Enterprise). */
export const QC_NOT_CONFIGURED_CODE = "QC_NOT_CONFIGURED"
/**
 * Error `code` when the organization's free trial has ended (view-only).
 * Returned by the QC, upload, approve, share and complete APIs, and set as the
 * Postgres error `hint` by the database's trial guard triggers.
 */
export const TRIAL_EXPIRED_CODE = "TRIAL_EXPIRED"
export const TRIAL_EXPIRED_MESSAGE =
  "Your free trial has ended. Your work is still here to view. Upgrade to keep working."

/** True for a Supabase/Postgres error raised by the trial guard triggers. */
export function isTrialExpiredDbError(
  error: { hint?: string | null; code?: string | null } | null | undefined
): boolean {
  return error?.hint === TRIAL_EXPIRED_CODE
}

const MISSING_DB_FUNCTION_CODES = new Set(["PGRST202", "42883"])

/**
 * True when an RPC failed because the database function doesn't exist yet
 * (migration not applied). Plan code uses this to fall back gracefully.
 */
export function isMissingDbFunctionError(
  error: { code?: string | null } | null | undefined
): boolean {
  return !!error?.code && MISSING_DB_FUNCTION_CODES.has(error.code)
}

/** Mirrors org_trial_state in the database. */
export type TrialStatus = "trial" | "expired" | "paid" | "legacy"

export type PlanId = (typeof PLAN_IDS)[number]

/**
 * A feature value from `plans.features`: a number is a limit, null is
 * unlimited, a boolean is included / not included, and the strings mark
 * features that aren't a plain yes / no.
 */
export type PlanFeatureValue =
  | number
  | boolean
  | null
  | "custom"
  | "limited"
  | "optional"

export interface PlanRow {
  id: PlanId
  name: string
  price_inr_monthly: number | null
  qc_runs_limit: number | null
  qc_period: "day" | "month"
  member_limit: number | null
  features: Record<string, PlanFeatureValue>
  sort_order: number
}

export interface QcBalance {
  plan_id: PlanId
  /** null = unlimited */
  limit: number | null
  used: number
  /** null = unlimited */
  remaining: number | null
  period: "day" | "month"
  window_start: string
  resets_at: string
  /** false for Enterprise without a QC allowance (present after migration v4) */
  configured?: boolean
  /** Runs left across active QC packs (present after migration v6) */
  pack_remaining?: number
  packs?: {
    id: string
    runs: number
    remaining: number
    expires_at: string
  }[]
  enforced: boolean
}

export interface OrgPlanUsage {
  plan: {
    id: PlanId
    name: string
    price_inr_monthly: number | null
  }
  plan_started_at: string
  qc: QcBalance
  members: {
    used: number
    /** null = unlimited */
    limit: number | null
  }
  /** Joined client users. Missing until the plans v5 migration is applied. */
  guests?: {
    used: number
    /** null = unlimited */
    limit: number | null
    /** Clients who signed up while seats were full */
    waiting: number
  }
  /** Missing until the storage migration (v4) is applied. */
  storage?: {
    used_bytes: number
    /** null when not configured (Enterprise without an override) */
    limit_bytes: number | null
    /** Plan storage without add-ons (present after migration v6) */
    base_bytes?: number | null
    /** Active storage add-ons (present after migration v6) */
    addon_bytes?: number
    addons?: { id: string; gb: number; ends_at: string }[]
    configured: boolean
    enforced: boolean
  }
  /** Free-trial status. Missing until the free trial migration is applied. */
  trial?: {
    status: TrialStatus
    ends_at: string | null
    /** Whole days left during the trial, 0 once expired, else null */
    days_left: number | null
  }
  version_history: {
    /** Days older versions are kept; null = unlimited */
    days: number | null
    /** Versions the owner was warned about, awaiting deletion */
    scheduled_count: number
    next_delete_at: string | null
  }
  enforced: boolean
  /** The owner's workspaces. Missing until billing v3 (account plans) is applied. */
  workspaces?: {
    /** Workspaces the owner has created */
    used: number
    /** null = unlimited */
    limit: number | null
    /** QC runs, storage, members and guests are counted across all of them */
    shared: boolean
  }
}

export interface PlanFeatureDefinition {
  key: string
  label: string
  /** Unit appended to numeric values, e.g. "days". */
  unit?: string
}

export interface PlanFeatureGroup {
  title: string
  features: PlanFeatureDefinition[]
}

/** Display order of the feature matrix stored in `plans.features`. */
export const PLAN_FEATURE_GROUPS: PlanFeatureGroup[] = [
  {
    title: "Projects and workspace",
    features: [
      { key: "workspaces", label: "Workspaces" },
      { key: "projects", label: "Projects / briefs" },
      { key: "active_design_files", label: "Active design files" },
      { key: "version_history_days", label: "Version history", unit: "days" },
    ],
  },
  {
    title: "Quality control",
    features: [{ key: "ai_design_checks", label: "AI design checks" }],
  },
  {
    title: "Master drive",
    features: [
      { key: "storage_gb", label: "Storage", unit: "GB" },
      { key: "iteration_retention_days", label: "Iterations auto-delete after", unit: "days" },
      { key: "brand_assets", label: "Brand assets" },
      { key: "smart_search", label: "Smart search" },
    ],
  },
  {
    title: "Collaboration",
    features: [
      { key: "creative_mode", label: "Creative mode" },
      { key: "productive_mode", label: "Productive mode" },
      { key: "internal_comments", label: "Internal comments" },
      { key: "guest_reviewers", label: "Guest reviewers" },
      { key: "approval_workflow", label: "Approval workflow" },
      { key: "role_based_permissions", label: "Role-based permissions" },
    ],
  },
  {
    title: "Sharing",
    features: [
      { key: "share_links", label: "Share links" },
      { key: "pdf_export", label: "PDF export" },
      { key: "image_export", label: "PNG / JPG export" },
      { key: "design_report_export", label: "Design report export" },
      { key: "watermark_free_export", label: "Watermark-free export" },
    ],
  },
  {
    title: "Security",
    features: [
      { key: "two_factor_auth", label: "Two-factor authentication" },
      { key: "sso_google_microsoft", label: "SSO (Google / Microsoft)" },
      { key: "saml_sso", label: "SAML SSO" },
      { key: "audit_logs", label: "Audit logs" },
    ],
  },
  {
    title: "Support",
    features: [
      { key: "email_support", label: "Email support" },
      { key: "priority_support", label: "Priority support" },
      { key: "dedicated_success_manager", label: "Dedicated success manager" },
      { key: "sla", label: "SLA" },
    ],
  },
]

/** 1 "GB" in plan labels = 1 GiB internally (binary units). */
export const BYTES_PER_GB = 1024 ** 3

/** Formats bytes with the plan's binary units, labelled MB / GB / TB. */
export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB"
  const tb = bytes / 1024 ** 4
  if (tb >= 1) return `${Number(tb.toFixed(tb >= 10 ? 0 : 2))} TB`
  const gb = bytes / BYTES_PER_GB
  if (gb >= 1) return `${Number(gb.toFixed(gb >= 10 ? 0 : 2))} GB`
  const mb = bytes / 1024 ** 2
  return `${Number(mb.toFixed(mb >= 10 ? 0 : 1))} MB`
}

export function formatPlanPrice(priceInrMonthly: number | null): string {
  if (priceInrMonthly === null) return "Custom"
  if (priceInrMonthly === 0) return "₹0"
  return `₹${priceInrMonthly.toLocaleString("en-IN")} / month`
}

export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString("en-IN")
}

export function formatQcAllowance(
  limit: number | null,
  period: "day" | "month"
): string {
  if (limit === null) return "Unlimited"
  return `${limit.toLocaleString("en-IN")} / ${period}`
}

export function formatPlanFeatureValue(
  value: PlanFeatureValue | undefined,
  unit?: string
): string {
  if (value === undefined) return "—"
  if (value === null) return "Unlimited"
  if (value === true) return "✓"
  if (value === false) return "—"
  if (value === "custom") return "Custom"
  if (value === "limited") return "Limited"
  if (value === "optional") return "Optional"
  if (unit === "GB" && value >= 1024 && value % 1024 === 0) {
    return `${value / 1024} TB`
  }
  return unit ? `${value.toLocaleString("en-IN")} ${unit}` : value.toLocaleString("en-IN")
}
