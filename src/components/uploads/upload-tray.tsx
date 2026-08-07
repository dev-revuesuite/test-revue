"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCreativeUploads } from "@/contexts/creative-upload-context"
import {
  estimateUploadTimeRemaining,
  formatUploadBytes,
} from "@/lib/upload-creative-file"
import { cn } from "@/lib/utils"

function UploadProgressRing({ progress }: { progress: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted-foreground/20"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-[#5C6ECD] transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
        {progress}%
      </span>
    </div>
  )
}

export function UploadTray() {
  const { jobs, activeCount, cancelUpload, dismissUpload } = useCreativeUploads()
  const [expanded, setExpanded] = useState(true)

  const visibleJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.phase === "uploading" ||
          job.phase === "processing" ||
          job.phase === "failed" ||
          job.phase === "done"
      ),
    [jobs]
  )

  if (visibleJobs.length === 0) return null

  return (
    <div className="pointer-events-auto">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5C6ECD]/10">
              <Upload className="h-4 w-4 text-[#5C6ECD]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Uploads</p>
              <p className="text-xs text-muted-foreground">
                {activeCount > 0
                  ? `${activeCount} in progress`
                  : "Recent uploads"}
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
            {visibleJobs.map((job) => {
              const elapsedMs = Date.now() - job.startedAt
              const timeLeft =
                job.phase === "uploading"
                  ? estimateUploadTimeRemaining(job.progress / 100, elapsedMs)
                  : null

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3"
                >
                  <div className="flex items-start gap-3">
                    {job.phase === "uploading" ? (
                      <UploadProgressRing progress={job.progress} />
                    ) : job.phase === "processing" ? (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5C6ECD]/10">
                        <Loader2 className="h-5 w-5 animate-spin text-[#5C6ECD]" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          job.phase === "done"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-red-500/10 text-red-600"
                        )}
                      >
                        {job.phase === "done" ? "Done" : "!"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {job.creativeName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job.projectName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.phase === "uploading" && (
                          <>
                            Uploading • {formatUploadBytes(job.fileSize)}
                            {timeLeft ? ` • ${timeLeft}` : ""}
                          </>
                        )}
                        {job.phase === "processing" &&
                          "Uploaded • finishing up..."}
                        {job.phase === "done" && "Upload complete"}
                        {job.phase === "failed" && (job.error || "Upload failed")}
                      </p>
                    </div>

                    {(job.phase === "uploading" || job.phase === "processing") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => cancelUpload(job.id)}
                        aria-label="Cancel upload"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    {(job.phase === "failed" || job.phase === "done") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => dismissUpload(job.id)}
                        aria-label="Dismiss upload"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
