import type { SupabaseClient } from "@supabase/supabase-js"

import {
  isCreativeQcPendingStage,
  normalizeCreativePipelineStatus,
} from "@/lib/creative-pipeline-status"

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

type CreativeRow = {
  id: string
  status: string | null
}

async function fetchCreativesInBatches(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<CreativeRow[]> {
  if (projectIds.length === 0) return []

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(projectIds.length / BATCH_SIZE) }, (_, i) => {
      const batch = projectIds.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE)
      return supabase
        .from("creatives")
        .select("id, status")
        .in("project_id", batch)
    })
  )

  return batches.flatMap((result) => (result.data ?? []) as CreativeRow[])
}

async function countIterationsInBatches(
  supabase: SupabaseClient,
  creativeIds: string[]
): Promise<number> {
  if (creativeIds.length === 0) return 0

  const batches = await Promise.all(
    Array.from(
      { length: Math.ceil(creativeIds.length / BATCH_SIZE) },
      (_, i) => {
        const batch = creativeIds.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE)
        return supabase
          .from("iterations")
          .select("id", { count: "exact", head: true })
          .in("creative_id", batch)
      }
    )
  )

  return batches.reduce((sum, result) => sum + (result.count ?? 0), 0)
}

/**
 * Studio dashboard stats derived from creative pipeline statuses (matches Room).
 */
export async function getStudioDashboardStats(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<StudioDashboardStats> {
  if (clientIds.length === 0) {
    return emptyStats
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .in("client_id", clientIds)

  const projectIds = projects?.map((project) => project.id) ?? []
  if (projectIds.length === 0) {
    return emptyStats
  }

  const creatives = await fetchCreativesInBatches(supabase, projectIds)
  if (creatives.length === 0) {
    return emptyStats
  }

  let qcPending = 0
  let feedback = 0

  for (const creative of creatives) {
    const normalized = normalizeCreativePipelineStatus(creative.status)
    if (isCreativeQcPendingStage(normalized)) {
      qcPending += 1
    }
    if (normalized === "feedback_received") {
      feedback += 1
    }
  }

  const iterations = await countIterationsInBatches(
    supabase,
    creatives.map((creative) => creative.id)
  )

  return {
    feedback,
    qcPending,
    iterations,
  }
}
