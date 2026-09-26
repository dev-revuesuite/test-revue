import type { DeploymentEnvironment } from "@/lib/deployment-environment"
import { listAiInferenceLogs } from "@/lib/ai-inference-log-query"
import {
  PlatformDeveloperAccessError,
  requirePlatformDeveloper,
} from "@/lib/platform-developer-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ENVIRONMENTS = new Set(["production", "staging", "development", "all"])
const ENDPOINTS = new Set(["gramcheck", "wordspace", "lineheight"])
const STATUSES = new Set(["running", "success", "failed"])
const SOURCES = new Set(["studio_analysis", "quick_analysis"])

export async function GET(request: Request) {
  try {
    await requirePlatformDeveloper()

    const { searchParams } = new URL(request.url)
    const environmentParam = searchParams.get("environment") || "production"
    const environment = ENVIRONMENTS.has(environmentParam)
      ? (environmentParam as DeploymentEnvironment | "all")
      : "production"

    const endpoint = searchParams.get("endpoint") || ""
    const status = searchParams.get("status") || ""
    const source = searchParams.get("source") || ""

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50)
    )
    const offset = Math.max(
      0,
      Number.parseInt(searchParams.get("offset") || "0", 10) || 0
    )

    const result = await listAiInferenceLogs({
      environment,
      endpoint: endpoint && ENDPOINTS.has(endpoint) ? endpoint : undefined,
      status: status && STATUSES.has(status) ? status : undefined,
      source: source && SOURCES.has(source) ? source : undefined,
      limit,
      offset,
    })

    return Response.json(result)
  } catch (error) {
    if (error instanceof PlatformDeveloperAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("[AI Logs API] list error", error)
    return Response.json({ error: "Failed to load AI logs" }, { status: 500 })
  }
}
