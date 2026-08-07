import { createClient } from "@/lib/supabase/server"
import {
  assertCanCreateQuickAnalysis,
  assertValidStoragePath,
  QuickAnalysisAccessError,
} from "@/lib/quick-analysis-access"
import {
  createQuickAnalysis,
  toQuickAnalysisServiceError,
} from "@/lib/quick-analysis-service"
import { getMediaTypeFromFile, type MediaType } from "@/lib/media-type"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { getUserRole } from "@/lib/get-user-role"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CreateQuickAnalysisBody {
  id?: string
  organizationId?: string
  fileName?: string
  storagePath?: string
  mediaType?: MediaType
  pageCount?: number | null
}

function isMediaType(value: unknown): value is MediaType {
  return value === "image" || value === "pdf"
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: CreateQuickAnalysisBody
    try {
      body = (await request.json()) as CreateQuickAnalysisBody
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const id = body.id?.trim()
    const fileName = body.fileName?.trim()
    const storagePath = body.storagePath?.trim()

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 })
    }

    if (!fileName) {
      return Response.json({ error: "fileName is required" }, { status: 400 })
    }

    if (!storagePath) {
      return Response.json({ error: "storagePath is required" }, { status: 400 })
    }

    const activeOrg = await getActiveOrganization(supabase, user.id)
    const organizationId = body.organizationId?.trim() || activeOrg?.id

    if (!organizationId) {
      return Response.json({ error: "No active organization" }, { status: 400 })
    }

    const { role } = await getUserRole(supabase, user.id, activeOrg)

    if (role === "client") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    await assertCanCreateQuickAnalysis(supabase, user.id, organizationId)
    assertValidStoragePath(storagePath, organizationId, id)

    const mediaType = isMediaType(body.mediaType)
      ? body.mediaType
      : getMediaTypeFromFile({ name: fileName, type: "" } as File)

    const pageCount =
      typeof body.pageCount === "number" && Number.isFinite(body.pageCount)
        ? Math.max(1, Math.floor(body.pageCount))
        : mediaType === "pdf"
          ? null
          : 1

    const result = await createQuickAnalysis(supabase, user.id, {
      id,
      organizationId,
      fileName,
      storagePath,
      mediaType,
      pageCount,
    })

    return Response.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof QuickAnalysisAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    const serviceError = toQuickAnalysisServiceError(error)
    return Response.json(
      { error: serviceError.message },
      { status: serviceError.status }
    )
  }
}
