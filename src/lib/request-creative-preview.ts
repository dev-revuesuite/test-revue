import { apiPath } from "@/lib/base-path"

export interface CreativePreviewRequestResult {
  previewUrl: string | null
  /**
   * False when this creative will never produce a preview -- too large, not a
   * PDF, no permission, no file. Callers must stop asking; otherwise every
   * mount re-requests a render that cannot succeed.
   */
  retryable: boolean
}

/**
 * Asks the server to render a PDF preview for a creative.
 *
 * Never throws: a missing preview degrades to the placeholder card, and losing
 * an upload because its thumbnail failed to render would be a bad trade.
 */
export async function requestCreativePreview(
  creativeId: string
): Promise<CreativePreviewRequestResult> {
  try {
    const response = await fetch(apiPath(`/api/creatives/${creativeId}/preview`), {
      method: "POST",
    })

    if (response.ok) {
      const data = (await response.json()) as { previewUrl?: string | null }
      // A 200 with no URL means the server gave a final reason (not-a-pdf,
      // too-large). Nothing to retry.
      return { previewUrl: data.previewUrl ?? null, retryable: false }
    }

    // 4xx is a settled answer about this creative: forbidden, missing, oversized.
    // Only server-side faults are worth another attempt.
    const retryable = response.status >= 500

    // 403 is routine -- clients may view creatives but not render previews.
    if (retryable) {
      console.error(
        `Preview generation failed for creative ${creativeId} (${response.status})`
      )
    }

    return { previewUrl: null, retryable }
  } catch (error) {
    // Network failure: worth retrying on a later visit.
    console.error(`Preview request failed for creative ${creativeId}:`, error)
    return { previewUrl: null, retryable: true }
  }
}
