import { createClient } from "@/lib/supabase/server"
import { CREATIVE_FILE_CACHE_CONTROL } from "@/lib/creative-storage"
import {
  getIterationPdfStreamSource,
  PdfStreamAccessError,
} from "@/lib/pdf-stream-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FORWARD_REQUEST_HEADERS = ["range", "if-range", "if-none-match", "if-modified-since"]

function buildProxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers()
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/pdf"
  )
  headers.set("Accept-Ranges", "bytes")
  headers.set(
    "Cache-Control",
    `public, max-age=${CREATIVE_FILE_CACHE_CONTROL}, immutable`
  )

  for (const name of [
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  return headers
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return proxyIterationPdf(request, context, "GET")
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return proxyIterationPdf(request, context, "HEAD")
}

async function proxyIterationPdf(
  request: Request,
  context: { params: Promise<{ id: string }> },
  method: "GET" | "HEAD"
) {
  try {
    const { id: iterationId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sourceUrl } = await getIterationPdfStreamSource(
      supabase,
      iterationId
    )

    const upstreamHeaders = new Headers()
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = request.headers.get(name)
      if (value) {
        upstreamHeaders.set(name, value)
      }
    }

    const upstream = await fetch(sourceUrl, {
      method,
      headers: upstreamHeaders,
      cache: "no-store",
    })

    if (!upstream.ok && upstream.status !== 206) {
      return Response.json(
        { error: "Failed to load PDF" },
        { status: upstream.status === 404 ? 404 : 502 }
      )
    }

    const headers = buildProxyResponseHeaders(upstream)

    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    if (error instanceof PdfStreamAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    console.error("PDF stream proxy failed:", error)
    return Response.json({ error: "Failed to load PDF" }, { status: 500 })
  }
}
