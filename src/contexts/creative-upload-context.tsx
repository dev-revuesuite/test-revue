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

import { createClient } from "@/lib/supabase/client"
import { processCreativeUpload } from "@/lib/process-creative-upload"
import type {
  CreativeUploadEvent,
  CreativeUploadJob,
  CreativeUploadListener,
  StartCreativeUploadInput,
} from "@/types/creative-upload"

interface CreativeUploadContextValue {
  jobs: CreativeUploadJob[]
  activeCount: number
  startCreativeUpload: (input: StartCreativeUploadInput) => string
  cancelUpload: (jobId: string) => void
  dismissUpload: (jobId: string) => void
  subscribe: (listener: CreativeUploadListener) => () => void
}

const CreativeUploadContext = createContext<CreativeUploadContextValue | null>(
  null
)

function createJob(input: StartCreativeUploadInput): CreativeUploadJob {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    creativeName: input.creativeName,
    creativeType: input.creativeType,
    fileName: input.file.name,
    fileSize: input.file.size,
    phase: "uploading",
    progress: 0,
    startedAt: Date.now(),
  }
}

export function CreativeUploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<CreativeUploadJob[]>([])
  const listenersRef = useRef<Set<CreativeUploadListener>>(new Set())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const emit = useCallback((event: CreativeUploadEvent) => {
    listenersRef.current.forEach((listener) => listener(event))
  }, [])

  const updateJob = useCallback(
    (jobId: string, patch: Partial<CreativeUploadJob>) => {
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job))
      )
    },
    []
  )

  const subscribe = useCallback((listener: CreativeUploadListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const dismissUpload = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
    abortControllersRef.current.delete(jobId)
  }, [])

  const cancelUpload = useCallback(
    (jobId: string) => {
      const controller = abortControllersRef.current.get(jobId)
      controller?.abort()

      setJobs((prev) => {
        const job = prev.find((item) => item.id === jobId)
        if (job) {
          emit({ type: "cancelled", jobId })
        }
        return prev.filter((item) => item.id !== jobId)
      })

      abortControllersRef.current.delete(jobId)
    },
    [emit]
  )

  const startCreativeUpload = useCallback(
    (input: StartCreativeUploadInput) => {
      const job = createJob(input)
      const controller = new AbortController()

      abortControllersRef.current.set(job.id, controller)
      setJobs((prev) => [job, ...prev])

      void (async () => {
        const supabase = createClient()

        try {
          const result = await processCreativeUpload(supabase, input, {
            signal: controller.signal,
            onUploadProgress: (progress) => {
              updateJob(job.id, { progress, phase: "uploading" })
              emit({
                type: "progress",
                jobId: job.id,
                progress,
                phase: "uploading",
              })
            },
            onPhaseChange: (phase) => {
              updateJob(job.id, { phase })
              emit({
                type: "progress",
                jobId: job.id,
                progress: phase === "processing" ? 92 : 0,
                phase,
              })
            },
          })

          const completedJob: CreativeUploadJob = {
            ...job,
            phase: "done",
            progress: 100,
            creativeId: result.creative.id,
          }

          setJobs((prev) =>
            prev.map((item) => (item.id === job.id ? completedJob : item))
          )

          emit({ type: "complete", job: completedJob, result })

          window.setTimeout(() => {
            dismissUpload(job.id)
          }, 5000)
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }

          const message =
            error instanceof Error
              ? error.message
              : "Upload failed. Please try again."

          const failedJob: CreativeUploadJob = {
            ...job,
            phase: "failed",
            error: message,
          }

          setJobs((prev) =>
            prev.map((item) => (item.id === job.id ? failedJob : item))
          )

          emit({ type: "failed", job: failedJob })
        } finally {
          abortControllersRef.current.delete(job.id)
        }
      })()

      return job.id
    },
    [dismissUpload, emit, updateJob]
  )

  const activeCount = useMemo(
    () =>
      jobs.filter(
        (job) => job.phase === "uploading" || job.phase === "processing"
      ).length,
    [jobs]
  )

  const value = useMemo(
    () => ({
      jobs,
      activeCount,
      startCreativeUpload,
      cancelUpload,
      dismissUpload,
      subscribe,
    }),
    [
      activeCount,
      cancelUpload,
      dismissUpload,
      jobs,
      startCreativeUpload,
      subscribe,
    ]
  )

  return (
    <CreativeUploadContext.Provider value={value}>
      {children}
    </CreativeUploadContext.Provider>
  )
}

export function useCreativeUploads() {
  const context = useContext(CreativeUploadContext)
  if (!context) {
    throw new Error("useCreativeUploads must be used within CreativeUploadProvider")
  }
  return context
}

export function useCreativeUploadListener(listener: CreativeUploadListener) {
  const { subscribe } = useCreativeUploads()
  const listenerRef = useRef(listener)
  listenerRef.current = listener

  useEffect(() => {
    return subscribe((event) => listenerRef.current(event))
  }, [subscribe])
}
