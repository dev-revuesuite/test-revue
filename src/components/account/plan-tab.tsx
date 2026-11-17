"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { RequestUpgradeButton } from "@/components/plans/request-upgrade-button"
import { createClient } from "@/lib/supabase/client"
import { useTimezone } from "@/contexts/timezone-context"
import { formatInstantInZone } from "@/lib/timezone-preference"
import {
  formatLimit,
  formatPlanFeatureValue,
  formatPlanPrice,
  formatQcAllowance,
  formatStorageBytes,
  PLAN_FEATURE_GROUPS,
  type OrgPlanUsage,
  type PlanRow,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

interface PlanTabProps {
  organizationId: string
}

function UsageMeter({
  label,
  used,
  limit,
  caption,
  format = (value) => value.toLocaleString("en-IN"),
  notConfigured = false,
}: {
  label: string
  used: number
  limit: number | null
  caption?: string
  format?: (value: number) => string
  /** No allowance set (Enterprise without an override): nothing is allowed. */
  notConfigured?: boolean
}) {
  const percent =
    limit === null ? 0 : limit === 0 ? 100 : Math.min(100, (used / limit) * 100)
  const full = limit !== null && used >= limit

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <p className="text-sm text-foreground tabular-nums">
          {format(used)}
          <span className="text-muted-foreground">
            {" "}
            /{" "}
            {notConfigured
              ? "Not configured"
              : limit === null
                ? formatLimit(limit)
                : format(limit)}
          </span>
        </p>
      </div>
      {limit !== null ? (
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              full ? "bg-destructive" : "bg-[#5C6ECD]"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
      {caption ? (
        <p className="text-xs text-muted-foreground mt-2">{caption}</p>
      ) : null}
    </div>
  )
}

export function PlanTab({ organizationId }: PlanTabProps) {
  const { timeZone } = useTimezone()
  const [usage, setUsage] = React.useState<OrgPlanUsage | null>(null)
  const [plans, setPlans] = React.useState<PlanRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      setError(null)
      const [usageResult, plansResult] = await Promise.all([
        supabase.rpc("get_org_plan_usage", {
          p_organization_id: organizationId,
        }),
        supabase
          .from("plans")
          .select(
            "id,name,price_inr_monthly,qc_runs_limit,qc_period,member_limit,features,sort_order"
          )
          .order("sort_order"),
      ])
      if (cancelled) return

      if (usageResult.error || plansResult.error) {
        console.error("Failed to load plan and usage:", {
          usage: usageResult.error?.message ?? null,
          plans: plansResult.error?.message ?? null,
        })
        setError("Couldn't load plan and usage. Please try again.")
      } else {
        setUsage(usageResult.data as OrgPlanUsage)
        setPlans((plansResult.data ?? []) as PlanRow[])
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading plan...
      </div>
    )
  }

  if (error || !usage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error ?? "Couldn't load plan and usage."}
      </div>
    )
  }

  const { plan, qc, members } = usage
  // Missing until the version-history migration is applied; hide the card then.
  const versionHistory: OrgPlanUsage["version_history"] | null =
    usage.version_history ?? null
  const resetLabel =
    qc.period === "day"
      ? "Resets daily at midnight IST"
      : `Resets on ${formatInstantInZone(qc.resets_at, timeZone)}`
  // Add-ons (present once migration v6 is applied).
  const packs = qc.packs ?? []
  const packRemaining = qc.pack_remaining ?? 0
  const packLabel =
    packs.length > 0
      ? ` QC packs: ${packRemaining.toLocaleString("en-IN")} run${packRemaining === 1 ? "" : "s"} left (expires ${formatInstantInZone(packs[0].expires_at, timeZone)}). Used after the plan's runs.`
      : ""
  const storageAddons = usage.storage?.addons ?? []
  const storageAddonLabel =
    usage.storage?.configured && storageAddons.length > 0
      ? ` ${formatStorageBytes(usage.storage.base_bytes ?? 0)} plan + ${formatStorageBytes(usage.storage.addon_bytes ?? 0)} add-on${storageAddons.length === 1 ? "" : "s"}, renews ${formatInstantInZone(storageAddons[0].ends_at, timeZone)}.`
      : ""

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Plan & usage</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your organization&apos;s plan and how much of it you&apos;ve used.
          </p>
        </div>
        {!usage.enforced ? (
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Limits not enforced
          </span>
        ) : null}
      </div>

      <div className="border border-border rounded-xl p-5 bg-card mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Current plan
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
          <span className="text-sm text-muted-foreground">
            {formatPlanPrice(plan.price_inr_monthly)}
          </span>
        </div>
        {plan.id !== "free" ? (
          <p className="text-xs text-muted-foreground mt-2">
            Started on {formatInstantInZone(usage.plan_started_at, timeZone)}
          </p>
        ) : null}
        {usage.trial?.status === "trial" || usage.trial?.status === "expired" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p
              className={cn(
                "text-sm font-medium",
                usage.trial.status === "expired"
                  ? "text-destructive"
                  : "text-amber-700 dark:text-amber-400"
              )}
            >
              {usage.trial.status === "expired"
                ? "Free trial ended. Your organization is view-only."
                : `Free trial: ${usage.trial.days_left ?? 0} ${usage.trial.days_left === 1 ? "day" : "days"} left`}
              {usage.trial.ends_at ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({usage.trial.status === "expired" ? "ended" : "ends"}{" "}
                  {formatInstantInZone(usage.trial.ends_at, timeZone)})
                </span>
              ) : null}
            </p>
            <RequestUpgradeButton size="sm" />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <UsageMeter
          label={qc.period === "day" ? "QC runs today" : "QC runs this month"}
          used={qc.used}
          limit={qc.limit}
          caption={
            qc.configured === false
              ? `Your plan has no QC allowance set up yet. Contact support.${packLabel}`
              : `${resetLabel}. Each check on each page uses 1 run.${packLabel}`
          }
          notConfigured={qc.configured === false}
        />
        <UsageMeter
          label="Team members"
          used={members.used}
          limit={members.limit}
          caption="Includes the owner. Clients and pending invites aren't counted."
        />
        {usage.guests ? (
          <UsageMeter
            label="Guest reviewers"
            used={usage.guests.used}
            limit={usage.guests.limit}
            caption={
              usage.guests.waiting > 0
                ? `Client users who have joined. ${usage.guests.waiting} client${usage.guests.waiting === 1 ? " is" : "s are"} waiting for a free seat.`
                : "Client users who have joined. Invited contacts who haven't signed up aren't counted."
            }
          />
        ) : null}
        {usage.storage ? (
          <UsageMeter
            label="Storage"
            used={usage.storage.used_bytes}
            limit={usage.storage.limit_bytes}
            format={formatStorageBytes}
            notConfigured={!usage.storage.configured}
            caption={
              usage.storage.configured
                ? `Designs, versions, Quick Analysis files and client brand files. Logos aren't counted.${storageAddonLabel} 1 GB = 1,073,741,824 bytes.`
                : "Your plan has no storage allowance set up yet. Contact support."
            }
          />
        ) : null}
      </div>

      {versionHistory ? (
        <VersionHistoryCard versionHistory={versionHistory} timeZone={timeZone} />
      ) : (
        <div className="mb-8" />
      )}

      {plans.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">
            Compare plans
          </h3>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Feature
                  </th>
                  {plans.map((row) => (
                    <th
                      key={row.id}
                      className={cn(
                        "text-left font-semibold px-4 py-3",
                        row.id === plan.id
                          ? "text-foreground bg-[#5C6ECD]/10"
                          : "text-foreground"
                      )}
                    >
                      {row.name}
                      {row.id === plan.id ? (
                        <span className="ml-2 text-xs font-normal text-[#5C6ECD]">
                          Current
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PlanRowCells
                  label="Price"
                  plans={plans}
                  currentPlanId={plan.id}
                  render={(row) => formatPlanPrice(row.price_inr_monthly)}
                />
                <PlanRowCells
                  label="QC runs"
                  plans={plans}
                  currentPlanId={plan.id}
                  render={(row) =>
                    row.id === "enterprise" && row.qc_runs_limit === null
                      ? "Custom"
                      : formatQcAllowance(row.qc_runs_limit, row.qc_period)
                  }
                />
                <PlanRowCells
                  label="Team members"
                  plans={plans}
                  currentPlanId={plan.id}
                  render={(row) => formatLimit(row.member_limit)}
                />
                {PLAN_FEATURE_GROUPS.map((group) => (
                  <React.Fragment key={group.title}>
                    <tr className="border-t border-border bg-muted/20">
                      <td
                        colSpan={plans.length + 1}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {group.title}
                      </td>
                    </tr>
                    {group.features.map((feature) => (
                      <PlanRowCells
                        key={feature.key}
                        label={feature.label}
                        plans={plans}
                        currentPlanId={plan.id}
                        render={(row) =>
                          formatPlanFeatureValue(
                            row.features[feature.key],
                            feature.unit
                          )
                        }
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function VersionHistoryCard({
  versionHistory,
  timeZone,
}: {
  versionHistory: OrgPlanUsage["version_history"]
  timeZone: string
}) {
  const { days, scheduled_count: scheduledCount, next_delete_at: nextDeleteAt } =
    versionHistory
  const dayLabel = days === null ? null : `${days} day${days === 1 ? "" : "s"}`

  return (
    <div className="border border-border rounded-xl p-4 bg-card mb-8">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-foreground">Version history</h3>
        <p className="text-sm text-foreground">{dayLabel ?? "Unlimited"}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {dayLabel === null
          ? "Older versions of your designs are kept."
          : `Older versions are deleted after ${dayLabel}. The latest version of each design is always kept.`}
      </p>
      {scheduledCount > 0 && nextDeleteAt ? (
        <p className="text-xs text-destructive mt-2">
          {scheduledCount} older version{scheduledCount === 1 ? "" : "s"} will
          be deleted from {formatInstantInZone(nextDeleteAt, timeZone)}.
        </p>
      ) : null}
    </div>
  )
}

function PlanRowCells({
  label,
  plans,
  currentPlanId,
  render,
}: {
  label: string
  plans: PlanRow[]
  currentPlanId: string
  render: (row: PlanRow) => string
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2.5 text-muted-foreground">{label}</td>
      {plans.map((row) => (
        <td
          key={row.id}
          className={cn(
            "px-4 py-2.5 text-foreground tabular-nums",
            row.id === currentPlanId && "bg-[#5C6ECD]/10"
          )}
        >
          {render(row)}
        </td>
      ))}
    </tr>
  )
}
