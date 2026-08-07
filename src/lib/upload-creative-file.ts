import type { SupabaseClient } from "@supabase/supabase-js"

import { CREATIVE_FILE_CACHE_CONTROL } from "@/lib/creative-storage"

export class CreativeFileUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CreativeFileUploadError"
  }
}

interface UploadCreativeFileOptions {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export async function uploadCreativeFileWithProgress(
  supabase: SupabaseClient,
  path: string,
  file: File,
  options: UploadCreativeFileOptions = {}
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new CreativeFileUploadError("Please sign in and try again.")
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!baseUrl || !apiKey) {
    throw new CreativeFileUploadError("Upload is not configured.")
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const url = `${baseUrl}/storage/v1/object/creatives/${encodedPath}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const handleAbort = () => {
      xhr.abort()
    }

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Upload cancelled", "AbortError"))
        return
      }
      options.signal.addEventListener("abort", handleAbort, { once: true })
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !options.onProgress) return
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100))
      )
      options.onProgress(percent)
    })

    xhr.addEventListener("load", () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", handleAbort)
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }

      reject(
        new CreativeFileUploadError(
          "Upload failed. Check your connection and try again."
        )
      )
    })

    xhr.addEventListener("error", () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", handleAbort)
      }
      reject(
        new CreativeFileUploadError(
          "Upload failed. Check your connection and try again."
        )
      )
    })

    xhr.addEventListener("abort", () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", handleAbort)
      }
      reject(new DOMException("Upload cancelled", "AbortError"))
    })

    xhr.open("POST", url)
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`)
    xhr.setRequestHeader("apikey", apiKey)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.setRequestHeader("x-upsert", "false")
    xhr.setRequestHeader(
      "Cache-Control",
      `max-age=${CREATIVE_FILE_CACHE_CONTROL}`
    )
    xhr.send(file)
  })

  const { data: urlData } = supabase.storage.from("creatives").getPublicUrl(path)
  return urlData.publicUrl
}

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function estimateUploadTimeRemaining(
  loadedRatio: number,
  elapsedMs: number
): string | null {
  if (loadedRatio <= 0 || loadedRatio >= 1 || elapsedMs < 1000) return null

  const remainingMs = (elapsedMs / loadedRatio) * (1 - loadedRatio)
  const remainingMinutes = Math.ceil(remainingMs / 60000)

  if (remainingMinutes <= 1) return "< 1m left"
  return `${remainingMinutes}m left`
}
