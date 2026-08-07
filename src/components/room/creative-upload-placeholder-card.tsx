"use client"

import { Loader2 } from "lucide-react"

import type { CreativeUploadJob } from "@/types/creative-upload"
import { cn } from "@/lib/utils"

interface CreativeUploadPlaceholderCardProps {
  job: CreativeUploadJob
}

export function CreativeUploadPlaceholderCard({
  job,
}: CreativeUploadPlaceholderCardProps) {
  const isUploading = job.phase === "uploading"

  return (
    <div className="overflow-hidden rounded-2xl border border-[#5C6ECD]/30 bg-card">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="absolute inset-0 h-24 w-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted-foreground/20"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={
                (2 * Math.PI * 42) * (1 - job.progress / 100)
              }
              className="text-[#5C6ECD] transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <span className="text-lg font-semibold text-foreground">
            {job.progress}%
          </span>
        </div>

        <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
          v1
        </div>
        <div className="absolute right-3 top-3 rounded-lg bg-[#5C6ECD]/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {isUploading ? "Uploading" : "Preparing"}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1.5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5C6ECD]/10">
            <Loader2 className="h-4 w-4 animate-spin text-[#5C6ECD]" />
          </div>
          <h4 className="truncate font-semibold text-foreground">
            {job.creativeName}
          </h4>
        </div>
        <p className="pl-9 text-xs text-muted-foreground">
          {isUploading
            ? `Uploading ${job.fileName}`
            : "Saving creative and preparing PDF for review..."}
        </p>
        <div className="mt-3 border-t border-border pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-[#5C6ECD] transition-all duration-300"
              )}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
