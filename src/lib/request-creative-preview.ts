import { apiPath } from "@/lib/base-path"

/**
 * Asks the server to render a PDF preview for a creative.
 *
 * Never throws: a missing preview degrades to the placeholder card, and losing
 * an upload because its thumbnail failed to render would be a bad trade.
 */
export async function requestCreativePreview(
  creativeId: string
): Promise<string | null> {
  try {
    const response = await fetch(apiPath(`/api/creatives/${creativeId}/preview`), {
      method: "POST",
    })

    if (!response.ok) {
      // 403 is expected: clients may view creatives but not render previews.
      if (response.status !== 403) {
        console.error(
          `Preview generation failed for creative ${creativeId} (${response.status})`
        )
      }
      return null
    }

    const data = (await response.json()) as { previewUrl?: string | null }
    return data.previewUrl ?? null
  } catch (error) {
    console.error(`Preview generation failed for creative ${creativeId}:`, error)
    return null
  }
}
