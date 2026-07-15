import { createClient } from "@/lib/supabase/server"
import { getInferenceApiBaseUrl } from "@/lib/inference-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEALTH_TIMEOUT_MS = 5_000
const EXPECTED_MESSAGE = "Hello World!"

/**
 * Proxies a lightweight ping to the inference API so the browser never talks
 * to the raw HTTP health host (avoids mixed-content / CORS). Always returns
 * 200 with `{ healthy: boolean }` for authenticated callers so the client can
 * trust the body without treating transport errors as outages.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let baseUrl: string
  try {
    baseUrl = getInferenceApiBaseUrl()
  } catch {
    return Response.json({ healthy: false })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/hello/`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })

    if (!response.ok) {
      return Response.json({ healthy: false })
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      return Response.json({ healthy: false })
    }

    const message =
      body && typeof body === "object" && "message" in body
        ? (body as { message: unknown }).message
        : undefined

    return Response.json({ healthy: message === EXPECTED_MESSAGE })
  } catch {
    return Response.json({ healthy: false })
  } finally {
    clearTimeout(timer)
  }
}
