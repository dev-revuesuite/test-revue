import { getAiInferenceLogDetail } from "@/lib/ai-inference-log-query"
import {
  PlatformDeveloperAccessError,
  requirePlatformDeveloper,
} from "@/lib/platform-developer-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformDeveloper()
    const { id } = await context.params

    if (!id?.trim()) {
      return Response.json({ error: "Missing log id" }, { status: 400 })
    }

    const row = await getAiInferenceLogDetail(id.trim())
    if (!row) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json(row)
  } catch (error) {
    if (error instanceof PlatformDeveloperAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("[AI Logs API] detail error", error)
    return Response.json({ error: "Failed to load AI log" }, { status: 500 })
  }
}
