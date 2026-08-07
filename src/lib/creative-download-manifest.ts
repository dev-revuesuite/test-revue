import type { SupabaseClient } from "@supabase/supabase-js"

import { getCreativeFileSize } from "@/lib/creative-storage"
import { getUserRole } from "@/lib/get-user-role"
import { resolveIterationMediaType, type MediaType } from "@/lib/media-type"

/**
 * Lists every downloadable file in a project, with sizes, so the browser can
 * decide whether a zip is safe to build before it starts downloading anything.
 *
 * Note: the `creatives` bucket is public, so this guard controls who gets the
 * *list* of files, not who can read a file whose URL they already hold.
 */

/** HEAD requests are cheap, but not free. Keep a lid on concurrency. */
const SIZE_LOOKUP_CONCURRENCY = 6

export class CreativeDownloadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "CreativeDownloadError"
  }
}

export interface DownloadableIteration {
  id: string
  version: number
  url: string
  filename: string
  mediaType: MediaType
  createdAt: string | null
  /** null when the storage server did not report a size. */
  bytes: number | null
}

export interface DownloadableCreative {
  id: string
  name: string
  type: string
  status: string | null
  iterations: DownloadableIteration[]
}

export interface DownloadManifest {
  projectId: string
  projectName: string
  namingColumns: string[]
  brandName: string
  clientName: string
  creatives: DownloadableCreative[]
  /** Sum of known sizes only. */
  totalBytes: number
  /** How many files have an unknown size, so callers can caveat the total. */
  unknownSizeCount: number
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const segment = new URL(url).pathname.split("/").pop() || ""
    const decoded = decodeURIComponent(segment.split("?")[0])
    return decoded || fallback
  } catch {
    return fallback
  }
}

/** Team members only. Clients may view creatives but not bulk-download them. */
async function assertCanDownloadProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{
  projectName: string
  namingColumns: string[]
  brandName: string
  clientName: string
}> {
  const { role, organizationId } = await getUserRole(supabase, userId)

  if (role === "client") {
    throw new CreativeDownloadError(
      "Only admins and designers can download project files",
      403
    )
  }

  if (!organizationId) {
    throw new CreativeDownloadError("No active organization", 403)
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, client_id, naming_columns")
    .eq("id", projectId)
    .single()

  if (error || !project) {
    throw new CreativeDownloadError("Project not found", 404)
  }

  // The project must belong to a client inside the caller's active organization.
  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id, name")
    .eq("id", project.client_id)
    .single()

  if (!client || client.organization_id !== organizationId) {
    throw new CreativeDownloadError("Project not found", 404)
  }

  const clientName = client.name || ""
  const namingColumns = Array.isArray(project.naming_columns)
    ? project.naming_columns.filter(
        (column): column is string => typeof column === "string" && column.trim() !== ""
      )
    : []

  return {
    projectName: project.name,
    namingColumns,
    brandName: clientName,
    clientName,
  }
}

/** Resolve sizes a few at a time rather than firing one request per file at once. */
async function attachSizes(
  iterations: DownloadableIteration[]
): Promise<void> {
  const queue = [...iterations]

  const worker = async () => {
    while (queue.length > 0) {
      const iteration = queue.shift()
      if (!iteration) break
      iteration.bytes = await getCreativeFileSize(iteration.url)
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(SIZE_LOOKUP_CONCURRENCY, iterations.length) },
      worker
    )
  )
}

export async function buildDownloadManifest(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<DownloadManifest> {
  const { projectName, namingColumns, brandName, clientName } =
    await assertCanDownloadProject(supabase, userId, projectId)

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, name, type, status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  const creativeIds = (creatives || []).map((c) => c.id)

  const { data: iterationRows } = creativeIds.length
    ? await supabase
        .from("iterations")
        .select("id, creative_id, version, image_url, media_type, created_at")
        .in("creative_id", creativeIds)
        .order("version", { ascending: true })
    : { data: [] }

  const allIterations: DownloadableIteration[] = []

  const byCreative: DownloadableCreative[] = (creatives || []).map(
    (creative) => {
      const iterations = (iterationRows || [])
        .filter((row) => row.creative_id === creative.id && row.image_url)
        .map((row) => {
          const iteration: DownloadableIteration = {
            id: row.id,
            version: row.version ?? 1,
            url: row.image_url,
            filename: filenameFromUrl(row.image_url, creative.name),
            mediaType: resolveIterationMediaType(row.media_type, row.image_url),
            createdAt: row.created_at ?? null,
            bytes: null,
          }
          allIterations.push(iteration)
          return iteration
        })

      return {
        id: creative.id,
        name: creative.name,
        type: creative.type || "design",
        status: creative.status ?? null,
        iterations,
      }
    }
  )

  await attachSizes(allIterations)

  const totalBytes = allIterations.reduce(
    (sum, iteration) => sum + (iteration.bytes ?? 0),
    0
  )
  const unknownSizeCount = allIterations.filter(
    (iteration) => iteration.bytes === null
  ).length

  return {
    projectId,
    projectName,
    namingColumns,
    brandName,
    clientName,
    // Creatives with no uploaded file are not downloadable.
    creatives: byCreative.filter((creative) => creative.iterations.length > 0),
    totalBytes,
    unknownSizeCount,
  }
}
