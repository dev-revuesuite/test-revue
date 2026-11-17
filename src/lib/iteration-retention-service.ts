import type { SupabaseClient } from "@supabase/supabase-js"

import { parseCreativeStorageObject } from "@/lib/creative-storage"
import { toWebPdfStoragePath } from "@/lib/pdf-web-copy"

/** The owner is warned at least this long before a version is deleted. */
export const RETENTION_NOTICE_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000
/** Keeps `.in(...)` filters well under URL length limits. */
const ID_CHUNK_SIZE = 100

export const ITERATION_DELETION_NOTIFICATION_TYPE = "iterations_scheduled_deletion"

interface RetentionCandidate {
  iteration_id: string
  creative_id: string
  creative_name: string | null
  project_id: string
  project_name: string | null
  organization_id: string
  owner_id: string
  version: number
  image_url: string | null
  media_type: string | null
  created_at: string
  retention_days: number
  /** created_at + retention days */
  delete_after: string
}

interface DeletionNotice {
  iteration_id: string
  organization_id: string
  creative_id: string
  warned_at: string
  scheduled_delete_at: string
}

export interface RetentionWarning {
  organizationId: string
  versionCount: number
  scheduledDeleteAt: string
  notified: boolean
}

export interface RetentionDeletion {
  iterationId: string
  organizationId: string
  creativeName: string | null
  version: number
  removedFiles: string[]
}

export interface RetentionFailure {
  iterationId: string
  error: string
}

export interface RetentionRunResult {
  dryRun: boolean
  ranAt: string
  candidates: number
  warned: RetentionWarning[]
  deleted: RetentionDeletion[]
  /** Notices dropped because the version no longer qualifies (upgrade, limits off, became latest). */
  cleared: number
  failed: RetentionFailure[]
}

export class IterationRetentionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = "IterationRetentionError"
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function formatDeleteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  })
}

async function loadCandidates(admin: SupabaseClient): Promise<RetentionCandidate[]> {
  const { data, error } = await admin.rpc("iteration_retention_candidates")
  if (error) {
    throw new IterationRetentionError("Failed to load retention candidates", error)
  }
  return (data ?? []) as RetentionCandidate[]
}

async function loadNotices(admin: SupabaseClient): Promise<DeletionNotice[]> {
  const { data, error } = await admin
    .from("iteration_deletion_notices")
    .select("iteration_id, organization_id, creative_id, warned_at, scheduled_delete_at")
  if (error) {
    throw new IterationRetentionError("Failed to load deletion notices", error)
  }
  return (data ?? []) as DeletionNotice[]
}

async function deleteNotices(admin: SupabaseClient, iterationIds: string[]) {
  for (const ids of chunk(iterationIds, ID_CHUNK_SIZE)) {
    const { error } = await admin
      .from("iteration_deletion_notices")
      .delete()
      .in("iteration_id", ids)
    if (error) {
      throw new IterationRetentionError("Failed to clear deletion notices", error)
    }
  }
}

async function notifyOwner(
  admin: SupabaseClient,
  organizationId: string,
  ownerId: string,
  versions: RetentionCandidate[],
  scheduledDeleteAt: string,
  retentionDays: number
): Promise<boolean> {
  const count = versions.length
  const date = formatDeleteDate(scheduledDeleteAt)
  const title = `${count} older version${count === 1 ? "" : "s"} will be deleted on ${date}`
  const body =
    `Your plan keeps version history for ${retentionDays} day${retentionDays === 1 ? "" : "s"}. ` +
    "The latest version of each design is always kept. Upgrade your plan to keep older versions."
  const creativeNames = [
    ...new Set(versions.map((v) => v.creative_name).filter((n): n is string => !!n)),
  ].slice(0, 5)

  const { error } = await admin.rpc("dispatch_notifications", {
    p_recipient_ids: [ownerId],
    p_organization_id: organizationId,
    p_type: ITERATION_DELETION_NOTIFICATION_TYPE,
    p_title: title,
    p_actor_id: null,
    p_body: body,
    p_link: "/account?tab=plan",
    p_resource_type: "organization",
    p_resource_id: organizationId,
    p_group_key: null,
    p_metadata: {
      version_count: count,
      scheduled_delete_at: scheduledDeleteAt,
      retention_days: retentionDays,
      creative_names: creativeNames,
    },
  })

  if (error) {
    console.error("[Iteration retention] Owner notification failed", {
      organizationId,
      error: error.message,
    })
    return false
  }
  return true
}

/** True when another iteration or a creative's thumbnail/preview still uses this URL. */
async function isFileUrlStillUsed(
  admin: SupabaseClient,
  fileUrl: string,
  iterationId: string
): Promise<boolean> {
  const [iterationRefs, thumbnailRefs, previewRefs] = await Promise.all([
    admin
      .from("iterations")
      .select("id", { count: "exact", head: true })
      .eq("image_url", fileUrl)
      .neq("id", iterationId),
    admin
      .from("creatives")
      .select("id", { count: "exact", head: true })
      .eq("thumbnail_url", fileUrl),
    admin
      .from("creatives")
      .select("id", { count: "exact", head: true })
      .eq("preview_url", fileUrl),
  ])

  for (const result of [iterationRefs, thumbnailRefs, previewRefs]) {
    // If we can't tell, keep the file.
    if (result.error) return true
    if ((result.count ?? 0) > 0) return true
  }
  return false
}

async function deleteVersion(
  admin: SupabaseClient,
  candidate: RetentionCandidate
): Promise<RetentionDeletion> {
  // Re-check right before deleting: never remove the creative's latest version.
  const { data: latest, error: latestError } = await admin
    .from("iterations")
    .select("id")
    .eq("creative_id", candidate.creative_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new IterationRetentionError("Failed to check the latest version", latestError)
  }
  if (!latest || latest.id === candidate.iteration_id) {
    throw new IterationRetentionError("Version is now the latest; not deleting")
  }

  const fileUrl = candidate.image_url?.trim() || null
  const fileStillUsed = fileUrl
    ? await isFileUrlStillUsed(admin, fileUrl, candidate.iteration_id)
    : true

  // Row first: feedback, drawings and AI results cascade with it. If this
  // fails, no file has been touched.
  const { error: deleteError } = await admin
    .from("iterations")
    .delete()
    .eq("id", candidate.iteration_id)

  if (deleteError) {
    throw new IterationRetentionError("Failed to delete version", deleteError)
  }

  const removedFiles: string[] = []
  const storageObject = fileUrl ? parseCreativeStorageObject(fileUrl) : null

  if (storageObject && !fileStillUsed) {
    const paths = [storageObject.path]
    if (storageObject.path.toLowerCase().endsWith(".pdf")) {
      const webCopy = toWebPdfStoragePath(storageObject.path)
      if (webCopy !== storageObject.path) paths.push(webCopy)
    }

    const { data: removed, error: removeError } = await admin.storage
      .from(storageObject.bucket)
      .remove(paths)

    if (removeError) {
      // The version is gone; only its file is left behind.
      console.error("[Iteration retention] File removal failed", {
        iterationId: candidate.iteration_id,
        bucket: storageObject.bucket,
        paths,
        error: removeError.message,
      })
    } else {
      for (const object of removed ?? []) {
        removedFiles.push(`${storageObject.bucket}/${object.name}`)
      }
    }
  }

  return {
    iterationId: candidate.iteration_id,
    organizationId: candidate.organization_id,
    creativeName: candidate.creative_name,
    version: candidate.version,
    removedFiles,
  }
}

/**
 * Daily version-history retention:
 * 1. Clear notices for versions that no longer qualify.
 * 2. Warn owners about newly qualifying versions (deleted 3+ days later).
 * 3. Delete versions whose notice is due and that are past retention.
 */
export async function runIterationRetention(
  admin: SupabaseClient,
  { dryRun = false, now = new Date() }: { dryRun?: boolean; now?: Date } = {}
): Promise<RetentionRunResult> {
  const [candidates, notices] = await Promise.all([
    loadCandidates(admin),
    loadNotices(admin),
  ])

  const candidateById = new Map(candidates.map((c) => [c.iteration_id, c]))
  const noticeById = new Map(notices.map((n) => [n.iteration_id, n]))
  const nowMs = now.getTime()

  const result: RetentionRunResult = {
    dryRun,
    ranAt: now.toISOString(),
    candidates: candidates.length,
    warned: [],
    deleted: [],
    cleared: 0,
    failed: [],
  }

  // 1. Clear stale notices.
  const staleIds = notices
    .filter((n) => !candidateById.has(n.iteration_id))
    .map((n) => n.iteration_id)
  result.cleared = staleIds.length
  if (!dryRun && staleIds.length > 0) {
    await deleteNotices(admin, staleIds)
  }

  // 2. Warn about new candidates, grouped per organization.
  const earliestDeleteMs = nowMs + RETENTION_NOTICE_DAYS * DAY_MS
  const toWarn = candidates.filter((c) => !noticeById.has(c.iteration_id))
  const warnByOrg = new Map<string, RetentionCandidate[]>()
  for (const candidate of toWarn) {
    const group = warnByOrg.get(candidate.organization_id) ?? []
    group.push(candidate)
    warnByOrg.set(candidate.organization_id, group)
  }

  for (const [organizationId, versions] of warnByOrg) {
    const rows = versions.map((v) => ({
      iteration_id: v.iteration_id,
      organization_id: v.organization_id,
      creative_id: v.creative_id,
      warned_at: now.toISOString(),
      scheduled_delete_at: new Date(
        Math.max(new Date(v.delete_after).getTime(), earliestDeleteMs)
      ).toISOString(),
    }))
    const scheduledDeleteAt = rows
      .map((r) => r.scheduled_delete_at)
      .sort()[0]

    if (dryRun) {
      result.warned.push({
        organizationId,
        versionCount: versions.length,
        scheduledDeleteAt,
        notified: false,
      })
      continue
    }

    // Warn first, then schedule. If the warning fails nothing is scheduled, so
    // a version is never deleted without the owner having been told; the next
    // run tries again.
    const notified = await notifyOwner(
      admin,
      organizationId,
      versions[0].owner_id,
      versions,
      scheduledDeleteAt,
      versions[0].retention_days
    )

    if (!notified) {
      for (const v of versions) {
        result.failed.push({
          iterationId: v.iteration_id,
          error: "Owner notification failed; nothing scheduled, will retry next run",
        })
      }
      continue
    }

    const { error: insertError } = await admin
      .from("iteration_deletion_notices")
      .upsert(rows, { onConflict: "iteration_id", ignoreDuplicates: true })

    if (insertError) {
      // Owner was warned but nothing is scheduled; the next run warns again.
      for (const v of versions) {
        result.failed.push({
          iterationId: v.iteration_id,
          error: `Failed to save deletion notice: ${insertError.message}`,
        })
      }
      continue
    }

    result.warned.push({
      organizationId,
      versionCount: versions.length,
      scheduledDeleteAt,
      notified: true,
    })
  }

  // 3. Delete versions whose notice is due and that are past retention.
  const due = notices
    .map((n) => ({ notice: n, candidate: candidateById.get(n.iteration_id) }))
    .filter(
      (entry): entry is { notice: DeletionNotice; candidate: RetentionCandidate } =>
        !!entry.candidate &&
        new Date(entry.notice.scheduled_delete_at).getTime() <= nowMs &&
        new Date(entry.candidate.delete_after).getTime() <= nowMs
    )

  for (const { candidate } of due) {
    if (dryRun) {
      result.deleted.push({
        iterationId: candidate.iteration_id,
        organizationId: candidate.organization_id,
        creativeName: candidate.creative_name,
        version: candidate.version,
        removedFiles: [],
      })
      continue
    }

    try {
      result.deleted.push(await deleteVersion(admin, candidate))
    } catch (error) {
      result.failed.push({
        iterationId: candidate.iteration_id,
        error: error instanceof Error ? error.message : "Failed to delete version",
      })
    }
  }

  return result
}
