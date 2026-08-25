import { isCreativeApproved } from "@/lib/creative-pipeline-status"

export interface ProjectCompletionBlockers {
  unapprovedCreatives: number
  openDeliverables: number
  totalCreatives: number
  totalDeliverables: number
}

export function getProjectCompletionBlockers(
  creatives: { status: string }[],
  deliverables: { status: string }[]
): ProjectCompletionBlockers {
  const unapprovedCreatives = creatives.filter(
    (creative) => !isCreativeApproved(creative.status)
  ).length

  const openDeliverables = deliverables.filter(
    (deliverable) => deliverable.status !== "completed"
  ).length

  return {
    unapprovedCreatives,
    openDeliverables,
    totalCreatives: creatives.length,
    totalDeliverables: deliverables.length,
  }
}

export function isProjectReadyToComplete(
  blockers: ProjectCompletionBlockers
): boolean {
  if (blockers.totalCreatives === 0) return false
  return (
    blockers.unapprovedCreatives === 0 && blockers.openDeliverables === 0
  )
}

/** e.g. "2 creatives not approved · 1 deliverable open" */
export function formatProjectCompletionWarning(
  blockers: ProjectCompletionBlockers
): string {
  const parts: string[] = []

  if (blockers.unapprovedCreatives > 0) {
    parts.push(
      `${blockers.unapprovedCreatives} creative${blockers.unapprovedCreatives === 1 ? "" : "s"} not approved`
    )
  }

  if (blockers.openDeliverables > 0) {
    parts.push(
      `${blockers.openDeliverables} deliverable${blockers.openDeliverables === 1 ? "" : "s"} open`
    )
  }

  return parts.join(" · ")
}
