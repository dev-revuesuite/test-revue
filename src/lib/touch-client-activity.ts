import type { SupabaseClient } from "@supabase/supabase-js"

export type ClientActivityTouch = {
  interaction?: boolean
  feedback?: boolean
}

const INTERACTION_ONLY: ClientActivityTouch = { interaction: true }
const INTERACTION_AND_FEEDBACK: ClientActivityTouch = {
  interaction: true,
  feedback: true,
}

function buildActivityUpdate(touch: ClientActivityTouch): Record<string, string> | null {
  const now = new Date().toISOString()
  const payload: Record<string, string> = {}

  if (touch.interaction) {
    payload.interaction_date = now
  }
  if (touch.feedback) {
    payload.feedback_date = now
  }

  return Object.keys(payload).length > 0 ? payload : null
}

export async function touchClientActivity(
  supabase: SupabaseClient,
  clientId: string,
  touch: ClientActivityTouch = INTERACTION_ONLY
): Promise<void> {
  if (!clientId) return

  const payload = buildActivityUpdate(touch)
  if (!payload) return

  const { error } = await supabase.from("clients").update(payload).eq("id", clientId)

  if (error) {
    console.error("Failed to update client activity:", error)
  }
}

export async function touchClientActivityByProjectId(
  supabase: SupabaseClient,
  projectId: string,
  touch: ClientActivityTouch = INTERACTION_ONLY
): Promise<void> {
  if (!projectId) return

  const { data, error } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .maybeSingle()

  if (error) {
    console.error("Failed to resolve client for project activity:", error)
    return
  }

  if (!data?.client_id) return

  await touchClientActivity(supabase, data.client_id, touch)
}

export async function touchClientActivityByCreativeId(
  supabase: SupabaseClient,
  creativeId: string,
  touch: ClientActivityTouch = INTERACTION_ONLY
): Promise<void> {
  if (!creativeId) return

  const { data, error } = await supabase
    .from("creatives")
    .select("project_id")
    .eq("id", creativeId)
    .maybeSingle()

  if (error) {
    console.error("Failed to resolve project for creative activity:", error)
    return
  }

  if (!data?.project_id) return

  await touchClientActivityByProjectId(supabase, data.project_id, touch)
}

export { INTERACTION_ONLY, INTERACTION_AND_FEEDBACK }
