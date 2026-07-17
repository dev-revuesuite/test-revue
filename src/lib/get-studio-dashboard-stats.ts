import type { SupabaseClient } from "@supabase/supabase-js"

export interface StudioDashboardStats {
  feedback: number
  qcPending: number
  iterations: number
}

const emptyStats: StudioDashboardStats = {
  feedback: 0,
  qcPending: 0,
  iterations: 0,
}

const BATCH_SIZE = 100

type StatsRow = {
  feedback: number | string | null
  qc_pending: number | string | null
  iterations: number | string | null
}

function toCount(value: number | string | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

async function collectIdsInBatches(
  parentIds: string[],
  fetchBatch: (batch: string[]) => Promise<{ id: string }[]>
): Promise<string[]> {
  if (parentIds.length === 0) return []

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(parentIds.length / BATCH_SIZE) }, (_, i) =>
      fetchBatch(parentIds.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE))
    )
  )

  return batches.flatMap((rows) => rows.map((row) => row.id))
}

async function countInBatches(
  ids: string[],
  countBatch: (batch: string[]) => Promise<number>
): Promise<number> {
  if (ids.length === 0) return 0

  const results = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / BATCH_SIZE) }, (_, i) =>
      countBatch(ids.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE))
    )
  )

  return results.reduce((sum, n) => sum + n, 0)
}

/**
 * Fallback when the SQL RPC is not deployed yet.
 * Avoids the old nested N+1 (per-creative iteration fetch → per-iteration feedback counts).
 */
async function getStudioDashboardStatsFallback(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<StudioDashboardStats> {
  const [{ count: qcPending }, { data: projects }] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("client_id", clientIds)
      .eq("brief_status", "qc_pending"),
    supabase.from("projects").select("id").in("client_id", clientIds),
  ])

  const projectIds = projects?.map((project) => project.id) ?? []
  if (projectIds.length === 0) {
    return { ...emptyStats, qcPending: qcPending ?? 0 }
  }

  const creativeIds = await collectIdsInBatches(projectIds, async (batch) => {
    const { data } = await supabase
      .from("creatives")
      .select("id")
      .in("project_id", batch)
    return data ?? []
  })

  if (creativeIds.length === 0) {
    return { ...emptyStats, qcPending: qcPending ?? 0 }
  }

  const iterationIds = await collectIdsInBatches(creativeIds, async (batch) => {
    const { data } = await supabase
      .from("iterations")
      .select("id")
      .in("creative_id", batch)
    return data ?? []
  })

  const feedback = await countInBatches(iterationIds, async (batch) => {
    const { count } = await supabase
      .from("feedbacks")
      .select("id", { count: "exact", head: true })
      .in("iteration_id", batch)
    return count ?? 0
  })

  return {
    feedback,
    qcPending: qcPending ?? 0,
    iterations: iterationIds.length,
  }
}

export async function getStudioDashboardStats(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<StudioDashboardStats> {
  if (clientIds.length === 0) {
    return emptyStats
  }

  const { data, error } = await supabase.rpc("get_studio_dashboard_stats", {
    p_client_ids: clientIds,
  })

  if (!error && data != null) {
    const row = (Array.isArray(data) ? data[0] : data) as StatsRow | null
    if (row) {
      return {
        feedback: toCount(row.feedback),
        qcPending: toCount(row.qc_pending),
        iterations: toCount(row.iterations),
      }
    }
  }

  return getStudioDashboardStatsFallback(supabase, clientIds)
}
