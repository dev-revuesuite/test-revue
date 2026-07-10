"use client"

import { useEffect, useState } from "react"

import { apiPath } from "@/lib/base-path"
// Type-only: the manifest module pulls in server-side code.
import type { DownloadManifest } from "@/lib/creative-download-manifest"

interface ManifestEntry {
  projectId: string
  data: DownloadManifest | null
  error: string | null
}

/**
 * Loads the list of downloadable files for a project, with sizes.
 *
 * Fetched when a project folder is opened so the list view can show sizes and
 * the download button knows the total before it starts. Clients never call this
 * -- the route would reject them anyway.
 *
 * The result is tagged with the project it belongs to, so switching projects
 * never briefly shows the previous project's sizes.
 */
export function useDownloadManifest(projectId: string | null, enabled: boolean) {
  const [entry, setEntry] = useState<ManifestEntry | null>(null)

  useEffect(() => {
    if (!projectId || !enabled) return

    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(
          apiPath(`/api/projects/${projectId}/download-manifest`)
        )
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(body.error || `Request failed (${response.status})`)
        }
        const data = (await response.json()) as DownloadManifest
        if (!cancelled) setEntry({ projectId, data, error: null })
      } catch (err) {
        if (!cancelled) {
          setEntry({
            projectId,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load files",
          })
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [projectId, enabled])

  // Only surface a result that belongs to the project currently being viewed.
  const current = projectId && entry?.projectId === projectId ? entry : null

  return {
    manifest: current?.data ?? null,
    error: current?.error ?? null,
    // Derived, not stored: a request is outstanding whenever we're enabled for a
    // project but hold no result for it yet.
    loading: Boolean(projectId) && enabled && current === null,
  }
}
