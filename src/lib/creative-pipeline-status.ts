/**
 * Per-creative workflow statuses (stored in creatives.status).
 * Project brief_status uses the same string values via deriveProjectBriefStatusFromCreatives.
 */

export const CREATIVE_PIPELINE_STATUSES = [
  "brief_received",
  "qc_pending",
  "review_qc",
  "iteration_shared",
  "feedback_received",
  "iteration_approved",
  "completed",
] as const

export type CreativePipelineStatus = (typeof CREATIVE_PIPELINE_STATUSES)[number]

export type ProjectBriefStatus = CreativePipelineStatus

export const CREATIVE_PIPELINE_STATUS_LABELS: Record<CreativePipelineStatus, string> = {
  brief_received: "Brief Received",
  qc_pending: "QC Pending",
  review_qc: "Review QC",
  iteration_shared: "Iteration Shared",
  feedback_received: "Feedback Received",
  iteration_approved: "Iteration Approved",
  completed: "Completed",
}

const PIPELINE_RANK: Record<CreativePipelineStatus, number> = {
  brief_received: 0,
  qc_pending: 1,
  review_qc: 2,
  iteration_shared: 3,
  feedback_received: 4,
  iteration_approved: 5,
  completed: 6,
}

const LEGACY_STATUS_MAP: Record<string, CreativePipelineStatus> = {
  in_progress: "qc_pending",
  completed: "iteration_approved",
}

export function isCreativePipelineStatus(value: string): value is CreativePipelineStatus {
  return (CREATIVE_PIPELINE_STATUSES as readonly string[]).includes(value)
}

/** Map DB / legacy values to a pipeline status. */
export function normalizeCreativePipelineStatus(
  value: string | null | undefined
): CreativePipelineStatus {
  if (!value) return "brief_received"
  if (isCreativePipelineStatus(value)) return value
  return LEGACY_STATUS_MAP[value] ?? "qc_pending"
}

/**
 * Project brief_status = slowest (earliest) stage among its creatives.
 * QC Pending filter counts projects with any creative still at qc_pending or earlier.
 */
export function deriveProjectBriefStatusFromCreatives(
  creativeStatuses: Iterable<string | null | undefined>
): ProjectBriefStatus {
  const normalized = [...creativeStatuses].map(normalizeCreativePipelineStatus)
  if (normalized.length === 0) return "brief_received"

  let slowest: CreativePipelineStatus = normalized[0]
  let slowestRank = PIPELINE_RANK[slowest]

  for (const status of normalized.slice(1)) {
    const rank = PIPELINE_RANK[status]
    if (rank < slowestRank) {
      slowest = status
      slowestRank = rank
    }
  }

  return slowest
}

export function getCreativePipelineStatusLabel(
  status: string | null | undefined
): string {
  return CREATIVE_PIPELINE_STATUS_LABELS[normalizeCreativePipelineStatus(status)]
}

export function getCreativePipelineRank(
  status: string | null | undefined
): number {
  return PIPELINE_RANK[normalizeCreativePipelineStatus(status)]
}

/** True while creative is still before client-facing share. */
export function isCreativePreShare(status: string | null | undefined): boolean {
  const rank = PIPELINE_RANK[normalizeCreativePipelineStatus(status)]
  return rank <= PIPELINE_RANK.review_qc
}

export type ProjectPipelineBadge = "not_started" | "in_progress" | "completed"

export function deriveProjectPipelineBadge(
  creativeStatuses: Iterable<string | null | undefined>
): ProjectPipelineBadge {
  const normalized = [...creativeStatuses].map(normalizeCreativePipelineStatus)
  if (normalized.length === 0) return "not_started"
  if (
    normalized.every(
      (status) => status === "iteration_approved" || status === "completed"
    )
  ) {
    return "completed"
  }
  return "in_progress"
}

export interface CreativePipelineSummaryCounts {
  total: number
  inQc: number
  shared: number
  feedback: number
  approved: number
}

export function summarizeCreativePipelineStatuses(
  creativeStatuses: Iterable<string | null | undefined>
): CreativePipelineSummaryCounts {
  const normalized = [...creativeStatuses].map(normalizeCreativePipelineStatus)

  return {
    total: normalized.length,
    inQc: normalized.filter(
      (status) =>
        status === "brief_received" ||
        status === "qc_pending" ||
        status === "review_qc"
    ).length,
    shared: normalized.filter((status) => status === "iteration_shared").length,
    feedback: normalized.filter((status) => status === "feedback_received")
      .length,
    approved: normalized.filter(
      (status) => status === "iteration_approved" || status === "completed"
    ).length,
  }
}

/** e.g. "3 creatives · 2 in QC · 1 shared" */
export function formatProjectCreativeSummary(
  counts: CreativePipelineSummaryCounts
): string {
  if (counts.total === 0) return "No creatives yet"

  const parts = [
    `${counts.total} creative${counts.total === 1 ? "" : "s"}`,
  ]

  if (counts.inQc > 0) {
    parts.push(`${counts.inQc} in QC`)
  }
  if (counts.shared > 0) {
    parts.push(`${counts.shared} shared`)
  }
  if (counts.feedback > 0) {
    parts.push(`${counts.feedback} feedback`)
  }
  if (counts.approved > 0) {
    parts.push(`${counts.approved} approved`)
  }

  return parts.join(" · ")
}

/** Room filter: project matches when any creative is at the filter stage. */
export function projectMatchesCreativeStatusFilter(
  creativeStatuses: Iterable<string | null | undefined>,
  filter: CreativePipelineStatus
): boolean {
  const normalized = [...creativeStatuses].map(normalizeCreativePipelineStatus)

  if (filter === "qc_pending") {
    return normalized.some(
      (status) => status === "brief_received" || status === "qc_pending"
    )
  }

  return normalized.some((status) => status === filter)
}

export function isCreativeApproved(status: string | null | undefined): boolean {
  const normalized = normalizeCreativePipelineStatus(status)
  return normalized === "iteration_approved" || normalized === "completed"
}

/** Approve is allowed once the creative has been shared with the client. */
export function canApproveCreative(status: string | null | undefined): boolean {
  const rank = getCreativePipelineRank(status)
  return (
    rank >= PIPELINE_RANK.iteration_shared &&
    rank < PIPELINE_RANK.iteration_approved
  )
}

/** Client feedback can advance a shared creative to Feedback Received. */
export function canReceiveClientFeedback(
  status: string | null | undefined
): boolean {
  const rank = getCreativePipelineRank(status)
  return (
    rank >= PIPELINE_RANK.iteration_shared &&
    rank < PIPELINE_RANK.feedback_received
  )
}

const LEGACY_PROJECT_STATUS_MAP: Record<string, CreativePipelineStatus> = {
  active: "brief_received",
  in_progress: "qc_pending",
}

/** Normalize project brief_status, optionally deriving from creatives. */
export function normalizeProjectBriefStatus(
  value: string | null | undefined,
  creativeStatuses?: Iterable<string | null | undefined>
): ProjectBriefStatus {
  if (creativeStatuses) {
    const statuses = [...creativeStatuses]
    if (statuses.length > 0) {
      return deriveProjectBriefStatusFromCreatives(statuses)
    }
  }

  if (!value) return "brief_received"
  if (isCreativePipelineStatus(value)) return value
  return LEGACY_PROJECT_STATUS_MAP[value] ?? normalizeCreativePipelineStatus(value)
}

/** Studio QC Pending tile — matches Room filter (brief_received + qc_pending). */
export function isCreativeQcPendingStage(
  status: string | null | undefined
): boolean {
  const normalized = normalizeCreativePipelineStatus(status)
  return normalized === "brief_received" || normalized === "qc_pending"
}

/** Zone status tab bucket for a pipeline status. */
export type ZoneStatusBucket = "todo" | "in_progress" | "review" | "done"

export function getZoneStatusBucket(
  status: string | null | undefined
): ZoneStatusBucket {
  const normalized = normalizeProjectBriefStatus(status)
  if (normalized === "brief_received") return "todo"
  if (normalized === "qc_pending" || normalized === "review_qc") {
    return "in_progress"
  }
  if (
    normalized === "iteration_shared" ||
    normalized === "feedback_received"
  ) {
    return "review"
  }
  return "done"
}
