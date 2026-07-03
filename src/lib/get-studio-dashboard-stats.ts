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

async function countByBatches(
  ids: string[],
  countBatch: (batch: string[]) => Promise<number>
): Promise<number> {
  let total = 0

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    total += await countBatch(ids.slice(i, i + BATCH_SIZE))
  }

  return total
}

async function countIterationsForCreatives(
  supabase: SupabaseClient,
  creativeIds: string[]
): Promise<number> {
  return countByBatches(creativeIds, async (batch) => {
    const { count } = await supabase
      .from("iterations")
      .select("id", { count: "exact", head: true })
      .in("creative_id", batch)

    return count ?? 0
  })
}

async function countFeedbacksForCreatives(
  supabase: SupabaseClient,
  creativeIds: string[]
): Promise<number> {
  let total = 0

  for (let i = 0; i < creativeIds.length; i += BATCH_SIZE) {
    const creativeBatch = creativeIds.slice(i, i + BATCH_SIZE)

    const { data: iterationRows } = await supabase
      .from("iterations")
      .select("id")
      .in("creative_id", creativeBatch)

    const iterationIds = iterationRows?.map((iteration) => iteration.id) ?? []
    if (iterationIds.length === 0) continue

    total += await countByBatches(iterationIds, async (iterationBatch) => {
      const { count } = await supabase
        .from("feedbacks")
        .select("id", { count: "exact", head: true })
        .in("iteration_id", iterationBatch)

      return count ?? 0
    })
  }

  return total
}

export async function getStudioDashboardStats(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<StudioDashboardStats> {
  if (clientIds.length === 0) {
    return emptyStats
  }

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
    return {
      ...emptyStats,
      qcPending: qcPending ?? 0,
    }
  }

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id")
    .in("project_id", projectIds)

  const creativeIds = creatives?.map((creative) => creative.id) ?? []
  if (creativeIds.length === 0) {
    return {
      ...emptyStats,
      qcPending: qcPending ?? 0,
    }
  }

  const [iterations, feedback] = await Promise.all([
    countIterationsForCreatives(supabase, creativeIds),
    countFeedbacksForCreatives(supabase, creativeIds),
  ])

  return {
    feedback,
    qcPending: qcPending ?? 0,
    iterations,
  }
}
