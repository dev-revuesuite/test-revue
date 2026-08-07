import type { AISuggestion } from "@/components/communication/comments-panel"
import type { ClientAnalysisImageInput } from "@/lib/ai-analysis-client-image"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"

export type AiAnalysisJobStatus =
  | "queued"
  | "running"
  | "done"
  | "empty"
  | "failed"
  | "cancelled"

/** Everything needed to start an analysis from anywhere in the app. */
export interface StartAiAnalysisInput {
  projectId: string
  projectName: string
  creativeId: string
  creativeName: string
  iterationId: string
  pageNumber: number
  analysisType: PersistedAiAnalysisType
  /**
   * Browser canvas snapshot — required for PDFs (captured before the user
   * leaves Revue), omitted for images (server downloads from storage).
   */
  clientImage?: ClientAnalysisImageInput
}

export interface AiAnalysisJob {
  id: string
  projectId: string
  projectName: string
  creativeId: string
  creativeName: string
  iterationId: string
  pageNumber: number
  analysisType: PersistedAiAnalysisType
  status: AiAnalysisJobStatus
  /** Populated when status is "done" (present but empty for "empty"). */
  suggestions: AISuggestion[]
  error?: string
  startedAt: number
  finishedAt?: number
  /**
   * Kept on PDF jobs so a failed run can be retried from any screen.
   * Dropped as soon as the job succeeds to bound memory usage.
   */
  clientImage?: ClientAnalysisImageInput
}

export type AiAnalysisJobEvent =
  | { type: "started"; job: AiAnalysisJob }
  | { type: "complete"; job: AiAnalysisJob }
  | { type: "empty"; job: AiAnalysisJob }
  | { type: "failed"; job: AiAnalysisJob }
  | { type: "cancelled"; jobId: string }

export type AiAnalysisJobListener = (event: AiAnalysisJobEvent) => void

/**
 * Two jobs are duplicates when they target the same iteration, page, and
 * analysis type — used to block double-starts while one is queued/running.
 */
export function aiAnalysisJobKey(
  input: Pick<
    StartAiAnalysisInput,
    "iterationId" | "pageNumber" | "analysisType"
  >
): string {
  return `${input.iterationId}:${input.pageNumber}:${input.analysisType}`
}

export function isActiveAiAnalysisStatus(status: AiAnalysisJobStatus): boolean {
  return status === "queued" || status === "running"
}
