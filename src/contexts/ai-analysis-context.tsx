"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { AISuggestion } from "@/components/communication/comments-panel"
import { apiPath } from "@/lib/base-path"
import {
  aiAnalysisJobKey,
  isActiveAiAnalysisStatus,
  type AiAnalysisJob,
  type AiAnalysisJobEvent,
  type AiAnalysisJobListener,
  type StartAiAnalysisInput,
} from "@/types/ai-analysis-job"

/** Protects the inference server; extra jobs wait in the queue. */
const MAX_CONCURRENT_ANALYSES = 2
/** Failed PDF jobs keep their page snapshot for retry; cap how many. */
const MAX_STORED_SNAPSHOTS = 3

interface AiAnalysisContextValue {
  jobs: AiAnalysisJob[]
  activeCount: number
  /** Returns the new job id, or null when the same analysis is already queued/running. */
  startAnalysis: (input: StartAiAnalysisInput) => string | null
  cancelAnalysis: (jobId: string) => void
  retryAnalysis: (jobId: string) => void
  dismissAnalysis: (jobId: string) => void
  subscribe: (listener: AiAnalysisJobListener) => () => void
}

const AiAnalysisContext = createContext<AiAnalysisContextValue | null>(null)

interface AnalyzeResponsePayload {
  suggestions?: AISuggestion[]
  empty?: boolean
  error?: string
}

function createJob(input: StartAiAnalysisInput): AiAnalysisJob {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    creativeId: input.creativeId,
    creativeName: input.creativeName,
    iterationId: input.iterationId,
    pageNumber: input.pageNumber,
    analysisType: input.analysisType,
    status: "queued",
    suggestions: [],
    startedAt: Date.now(),
    clientImage: input.clientImage,
  }
}

/** Keep snapshots only on the newest failed jobs so memory stays bounded. */
function pruneStoredSnapshots(jobs: AiAnalysisJob[]): AiAnalysisJob[] {
  let kept = 0
  return jobs.map((job) => {
    if (!job.clientImage || isActiveAiAnalysisStatus(job.status)) {
      return job
    }
    if (job.status === "failed" && kept < MAX_STORED_SNAPSHOTS) {
      kept += 1
      return job
    }
    // Succeeded, cancelled, or over the cap: the snapshot is no longer needed.
    const { clientImage: _dropped, ...rest } = job
    return rest
  })
}

export function AiAnalysisProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<AiAnalysisJob[]>([])
  const jobsRef = useRef<AiAnalysisJob[]>([])
  const listenersRef = useRef<Set<AiAnalysisJobListener>>(new Set())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const emit = useCallback((event: AiAnalysisJobEvent) => {
    listenersRef.current.forEach((listener) => listener(event))
  }, [])

  /** All job mutations go through here so jobsRef is always current. */
  const applyJobs = useCallback(
    (updater: (prev: AiAnalysisJob[]) => AiAnalysisJob[]) => {
      jobsRef.current = pruneStoredSnapshots(updater(jobsRef.current))
      setJobs(jobsRef.current)
    },
    []
  )

  const updateJob = useCallback(
    (jobId: string, patch: Partial<AiAnalysisJob>) => {
      applyJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job))
      )
    },
    [applyJobs]
  )

  const subscribe = useCallback((listener: AiAnalysisJobListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const runJob = useCallback(
    async (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId)
      if (!job || job.status !== "queued") return

      const controller = new AbortController()
      abortControllersRef.current.set(jobId, controller)

      updateJob(jobId, { status: "running" })
      const startedJob = jobsRef.current.find((item) => item.id === jobId)
      if (startedJob) {
        emit({ type: "started", job: startedJob })
      }

      try {
        const response = await fetch(apiPath("/api/ai/analyze"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            iterationId: job.iterationId,
            analysisType: job.analysisType,
            pageNumber: job.pageNumber,
            ...(job.clientImage ? { clientImage: job.clientImage } : {}),
          }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as AnalyzeResponsePayload

        if (!response.ok) {
          throw new Error(payload.error || "AI analysis failed")
        }

        const suggestions = payload.suggestions ?? []
        const isEmpty = payload.empty === true || suggestions.length === 0

        updateJob(jobId, {
          status: isEmpty ? "empty" : "done",
          suggestions,
          finishedAt: Date.now(),
        })

        const finishedJob = jobsRef.current.find((item) => item.id === jobId)
        if (finishedJob) {
          emit({ type: isEmpty ? "empty" : "complete", job: finishedJob })
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // cancelAnalysis already updated status and emitted.
          return
        }

        const message =
          error instanceof Error ? error.message : "AI analysis failed"

        updateJob(jobId, {
          status: "failed",
          error: message,
          finishedAt: Date.now(),
        })

        const failedJob = jobsRef.current.find((item) => item.id === jobId)
        if (failedJob) {
          emit({ type: "failed", job: failedJob })
        }
      } finally {
        abortControllersRef.current.delete(jobId)
        // Pump the queue after every terminal state.
        startNextQueuedRef.current()
      }
    },
    [emit, updateJob]
  )

  const startNextQueued = useCallback(() => {
    const running = jobsRef.current.filter(
      (job) => job.status === "running"
    ).length
    if (running >= MAX_CONCURRENT_ANALYSES) return

    // Jobs are newest-first; run the oldest queued job first.
    const nextQueued = [...jobsRef.current]
      .reverse()
      .find((job) => job.status === "queued")
    if (nextQueued) {
      void runJob(nextQueued.id)
    }
  }, [runJob])

  // runJob's finally-block needs startNextQueued, which needs runJob — break
  // the cycle with a ref.
  const startNextQueuedRef = useRef(startNextQueued)
  startNextQueuedRef.current = startNextQueued

  const startAnalysis = useCallback(
    (input: StartAiAnalysisInput): string | null => {
      const key = aiAnalysisJobKey(input)
      const duplicate = jobsRef.current.some(
        (job) =>
          isActiveAiAnalysisStatus(job.status) && aiAnalysisJobKey(job) === key
      )
      if (duplicate) return null

      const job = createJob(input)
      applyJobs((prev) => [job, ...prev])
      startNextQueued()
      return job.id
    },
    [applyJobs, startNextQueued]
  )

  const cancelAnalysis = useCallback(
    (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId)
      if (!job || !isActiveAiAnalysisStatus(job.status)) return

      updateJob(jobId, { status: "cancelled", finishedAt: Date.now() })
      emit({ type: "cancelled", jobId })

      // Abort after updating state so the fetch handler sees "cancelled".
      abortControllersRef.current.get(jobId)?.abort()
      abortControllersRef.current.delete(jobId)

      startNextQueued()
    },
    [emit, startNextQueued, updateJob]
  )

  const retryAnalysis = useCallback(
    (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId)
      if (!job || (job.status !== "failed" && job.status !== "cancelled")) {
        return
      }

      updateJob(jobId, {
        status: "queued",
        error: undefined,
        suggestions: [],
        startedAt: Date.now(),
        finishedAt: undefined,
      })
      startNextQueued()
    },
    [startNextQueued, updateJob]
  )

  const dismissAnalysis = useCallback(
    (jobId: string) => {
      abortControllersRef.current.get(jobId)?.abort()
      abortControllersRef.current.delete(jobId)
      applyJobs((prev) => prev.filter((job) => job.id !== jobId))
    },
    [applyJobs]
  )

  // Abort everything if the provider itself unmounts (full page teardown).
  useEffect(() => {
    const controllers = abortControllersRef.current
    return () => {
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
    }
  }, [])

  const activeCount = useMemo(
    () => jobs.filter((job) => isActiveAiAnalysisStatus(job.status)).length,
    [jobs]
  )

  const value = useMemo(
    () => ({
      jobs,
      activeCount,
      startAnalysis,
      cancelAnalysis,
      retryAnalysis,
      dismissAnalysis,
      subscribe,
    }),
    [
      jobs,
      activeCount,
      startAnalysis,
      cancelAnalysis,
      retryAnalysis,
      dismissAnalysis,
      subscribe,
    ]
  )

  return (
    <AiAnalysisContext.Provider value={value}>
      {children}
    </AiAnalysisContext.Provider>
  )
}

export function useAiAnalysisJobs() {
  const context = useContext(AiAnalysisContext)
  if (!context) {
    throw new Error("useAiAnalysisJobs must be used within AiAnalysisProvider")
  }
  return context
}

export function useAiAnalysisListener(listener: AiAnalysisJobListener) {
  const { subscribe } = useAiAnalysisJobs()
  const listenerRef = useRef(listener)
  listenerRef.current = listener

  useEffect(() => {
    return subscribe((event) => listenerRef.current(event))
  }, [subscribe])
}
