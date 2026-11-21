// Server only: runs follow-up work (sending emails) after the response has
// gone out, so a slow email provider never delays a webhook answer or a click.

import { after } from "next/server"

export function afterResponse(task: () => Promise<unknown>): void {
  const safe = async () => {
    try {
      await task()
    } catch (error) {
      console.error("[billing] Follow-up task failed:", error instanceof Error ? error.message : String(error))
    }
  }
  try {
    after(safe)
  } catch {
    // Outside a request (unit tests, scripts): run it now, without waiting.
    void safe()
  }
}
