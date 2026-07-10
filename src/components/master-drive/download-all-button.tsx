"use client"

import { useState } from "react"
import { ChevronDown, Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DownloadManifest } from "@/lib/creative-download-manifest"
import {
  ZIP_MAX_BYTES,
  downloadProjectCreatives,
  isOverLimit,
  needsSizeConfirmation,
  planDownload,
  plannedBytes,
  type CreativeFilter,
  type DownloadProgress,
} from "@/lib/download-creatives"
import { formatBytes } from "@/lib/download-utils"

const FILTER_LABELS: Record<CreativeFilter, string> = {
  all: "All Resources",
  image: "Images only",
  pdf: "PDFs only",
}

const EMPTY_MESSAGES: Record<CreativeFilter, string> = {
  all: "There are no files to download in this project.",
  image: "There are no images to download in this project.",
  pdf: "There are no PDFs to download in this project.",
}

interface PendingDownload {
  filter: CreativeFilter
  bytes: number
  fileCount: number
  unknownSizeCount: number
}

export function DownloadAllButton({
  manifest,
  loading,
}: {
  manifest: DownloadManifest | null
  loading: boolean
}) {
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [pending, setPending] = useState<PendingDownload | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isDownloading = progress !== null
  const hasFiles = (manifest?.creatives.length ?? 0) > 0

  const run = async (filter: CreativeFilter) => {
    if (!manifest) return
    setPending(null)
    setProgress({ completed: 0, total: 0, currentName: "" })

    try {
      const result = await downloadProjectCreatives(manifest, {
        filter,
        onProgress: setProgress,
      })
      setMessage(
        result.failed.length > 0
          ? `Downloaded ${result.downloaded} file${
              result.downloaded === 1 ? "" : "s"
            }. ${result.failed.length} could not be fetched: ${result.failed.join(", ")}`
          : null
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Download failed")
    } finally {
      setProgress(null)
    }
  }

  const start = (filter: CreativeFilter) => {
    if (!manifest) return

    const files = planDownload(manifest, filter)
    if (files.length === 0) {
      setMessage(EMPTY_MESSAGES[filter])
      return
    }

    const bytes = plannedBytes(files)

    if (isOverLimit(bytes)) {
      setMessage(
        `This download is ${formatBytes(bytes)}, over the ${formatBytes(
          ZIP_MAX_BYTES
        )} limit. Try filtering by type, or download creatives individually.`
      )
      return
    }

    if (needsSizeConfirmation(bytes)) {
      const unknownSizeCount = files.filter((f) => f.iteration.bytes === null).length
      setPending({ filter, bytes, fileCount: files.length, unknownSizeCount })
      return
    }

    void run(filter)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={loading || isDownloading || !hasFiles}
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress.total > 0
                  ? `Downloading ${progress.completed}/${progress.total}...`
                  : "Preparing..."}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(FILTER_LABELS) as CreativeFilter[]).map((filter) => {
            const count = manifest ? planDownload(manifest, filter).length : 0
            return (
              <DropdownMenuItem
                key={filter}
                disabled={count === 0}
                onSelect={() => start(filter)}
              >
                {FILTER_LABELS[filter]}
                <span className="ml-auto pl-4 text-xs text-muted-foreground">
                  {count}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Large download confirmation */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>This is a large download</DialogTitle>
            <DialogDescription>
              {pending &&
                `${pending.fileCount} file${
                  pending.fileCount === 1 ? "" : "s"
                }, about ${formatBytes(pending.bytes)}${
                  pending.unknownSizeCount > 0 ? " or more" : ""
                }. It may take a few minutes and will use a lot of memory. Keep this tab open.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#5C6ECD] hover:bg-[#4a5bb8]"
              onClick={() => pending && run(pending.filter)}
            >
              Download anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refusals and partial-failure reports */}
      <Dialog open={message !== null} onOpenChange={(open) => !open && setMessage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download</DialogTitle>
            <DialogDescription className="break-words">{message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setMessage(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
