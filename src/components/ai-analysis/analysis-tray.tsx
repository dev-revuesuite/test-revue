"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAiAnalysisJobs } from "@/contexts/ai-analysis-context"
import { appRoute } from "@/lib/base-path"
import type { PersistedAiAnalysisType } from "@/lib/map-ai-suggestion-rows"
import { isActiveAiAnalysisStatus, type AiAnalysisJob } from "@/types/ai-analysis-job"
import { cn } from "@/lib/utils"

const ANALYSIS_TYPE_LABELS: Record<PersistedAiAnalysisType, string> = {
  lineheight: "Line height check",
  spacing: "Spacing analysis",
  spelling: "Text & spelling",
}

function jobStatusText(job: AiAnalysisJob): string {
  switch (job.status) {
    case "queued":
      return "Waiting to start..."
    case "running":
      return "Analyzing..."
    case "done":
      return `${job.suggestions.length} suggestion${
        job.suggestions.length === 1 ? "" : "s"
      } found`
    case "empty":
      return "Done — no issues found"
    case "failed":
      return job.error || "Analysis failed"
    case "cancelled":
      return "Cancelled"
  }
}

function JobStatusIcon({ job }: { job: AiAnalysisJob }) {
  if (job.status === "running") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5C6ECD]/10">
        <Loader2 className="h-5 w-5 animate-spin text-[#5C6ECD]" />
      </div>
    )
  }

  if (job.status === "queued") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  if (job.status === "done" || job.status === "empty") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
        <Check className="h-5 w-5 text-emerald-600" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        job.status === "failed"
          ? "bg-red-500/10 text-red-600"
          : "bg-muted text-muted-foreground"
      )}
    >
      {job.status === "failed" ? "!" : <X className="h-5 w-5" />}
    </div>
  )
}

export function AnalysisTray() {
  const router = useRouter()
  const { jobs, activeCount, cancelAnalysis, retryAnalysis, dismissAnalysis } =
    useAiAnalysisJobs()
  const [expanded, setExpanded] = useState(true)

  const visibleJobs = jobs

  if (visibleJobs.length === 0) return null

  const openResults = (job: AiAnalysisJob) => {
    // Soft-nav on the same /revue route only changes search params — RevueCanvas
    // must remount via key={creativeId} (see revue/page.tsx) or state stays stale.
    router.push(
      appRoute(
        `/revue?projectId=${encodeURIComponent(job.projectId)}&creativeId=${encodeURIComponent(job.creativeId)}&page=${job.pageNumber}&view=ai`
      )
    )
  }

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6ECD]/10">
            <Sparkles className="h-4 w-4 text-[#5C6ECD]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Analysis</p>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} running`
                : "Recent analyses"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="max-h-72 space-y-2 overflow-y-auto p-2">
          {visibleJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-border/70 bg-muted/20 p-3"
            >
              <div className="flex items-start gap-3">
                <JobStatusIcon job={job} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {job.creativeName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ANALYSIS_TYPE_LABELS[job.analysisType]} • Page{" "}
                    {job.pageNumber}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      job.status === "failed"
                        ? "text-red-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {jobStatusText(job)}
                  </p>

                  {(job.status === "done" || job.status === "empty") && (
                    <button
                      type="button"
                      onClick={() => openResults(job)}
                      className="mt-1.5 text-xs font-medium text-[#5C6ECD] hover:underline"
                    >
                      View results
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {(job.status === "failed" || job.status === "cancelled") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => retryAnalysis(job.id)}
                      aria-label="Retry analysis"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      isActiveAiAnalysisStatus(job.status)
                        ? cancelAnalysis(job.id)
                        : dismissAnalysis(job.id)
                    }
                    aria-label={
                      isActiveAiAnalysisStatus(job.status)
                        ? "Cancel analysis"
                        : "Dismiss"
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
