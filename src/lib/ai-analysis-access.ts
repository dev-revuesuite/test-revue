import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveIterationMediaType, type MediaType } from "@/lib/media-type"

export class AiAnalysisAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "AiAnalysisAccessError"
  }
}

export interface IterationForAnalysis {
  id: string
  creative_id: string
  image_url: string
  media_type: MediaType
  page_count: number | null
}

export interface AiAnalysisAccessContext {
  userId: string
  iteration: IterationForAnalysis
}

async function assertTeamMemberForIteration(
  supabase: SupabaseClient,
  iterationId: string,
  action: "run" | "manage"
): Promise<void> {
  const { data: isMember, error } = await supabase.rpc(
    "user_is_team_member_for_iteration",
    { p_iteration_id: iterationId }
  )

  if (error) {
    throw new AiAnalysisAccessError("Failed to verify project access", 500)
  }

  if (!isMember) {
    throw new AiAnalysisAccessError(
      action === "run"
        ? "Only admins and designers on this project can run AI analysis"
        : "Only admins and designers on this project can manage AI suggestions",
      403
    )
  }
}

export async function assertCanRunAiAnalysis(
  supabase: SupabaseClient,
  userId: string,
  iterationId: string
): Promise<AiAnalysisAccessContext> {
  const { data: iteration, error } = await supabase
    .from("iterations")
    .select("id, creative_id, image_url, media_type, page_count")
    .eq("id", iterationId)
    .single()

  if (error || !iteration) {
    throw new AiAnalysisAccessError("Iteration not found", 404)
  }

  await assertTeamMemberForIteration(supabase, iterationId, "run")

  if (!iteration.image_url) {
    throw new AiAnalysisAccessError("Iteration has no creative file", 400)
  }

  return {
    userId,
    iteration: {
      id: iteration.id,
      creative_id: iteration.creative_id,
      image_url: iteration.image_url,
      media_type: resolveIterationMediaType(
        iteration.media_type,
        iteration.image_url
      ),
      page_count: iteration.page_count,
    },
  }
}

export async function assertCanManageAiSuggestion(
  supabase: SupabaseClient,
  userId: string,
  suggestionId: string
): Promise<{ suggestionId: string; iterationId: string }> {
  const { data: suggestion, error } = await supabase
    .from("ai_suggestions")
    .select("id, iteration_id")
    .eq("id", suggestionId)
    .single()

  if (error || !suggestion) {
    throw new AiAnalysisAccessError("AI suggestion not found", 404)
  }

  await assertTeamMemberForIteration(
    supabase,
    suggestion.iteration_id,
    "manage"
  )

  return {
    suggestionId: suggestion.id,
    iterationId: suggestion.iteration_id,
  }
}
