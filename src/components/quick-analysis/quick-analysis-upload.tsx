"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CloudUpload,
  FileImage,
  FileText,
  Loader2,
  Upload,
  Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  buildQuickAnalysisStoragePath,
} from "@/lib/quick-analysis-access"
import { QUICK_ANALYSIS_BUCKET } from "@/lib/quick-analysis-storage"
import { getMediaTypeFromFile, isPdfFile } from "@/lib/media-type"
import { getPdfPageCountFromUrl } from "@/lib/pdf-page-count"
import { apiPath } from "@/lib/base-path"

const MAX_FILE_MB = 50
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

interface QuickAnalysisUploadProps {
  organizationId: string
}

export function QuickAnalysisUpload({ organizationId }: QuickAnalysisUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<"idle" | "uploading" | "opening">("idle")
  const isBusy = phase !== "idle"

  const handleFile = async (file: File) => {
    setErrorMessage(null)

    const isPdf = isPdfFile(file)
    const isImage = file.type.startsWith("image/")

    if (!isPdf && !isImage) {
      setErrorMessage("Unsupported file type. Please upload an image or PDF.")
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(`File is larger than ${MAX_FILE_MB}MB.`)
      return
    }

    setPhase("uploading")

    try {
      const quickAnalysisId = crypto.randomUUID()
      const mediaType = getMediaTypeFromFile(file)
      const storagePath = buildQuickAnalysisStoragePath(
        organizationId,
        quickAnalysisId,
        file.name
      )

      const { error: uploadError } = await supabase.storage
        .from(QUICK_ANALYSIS_BUCKET)
        .upload(storagePath, file)

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload file")
      }

      let pageCount: number | null = mediaType === "pdf" ? null : 1

      if (mediaType === "pdf") {
        const blobUrl = URL.createObjectURL(file)
        try {
          pageCount = await getPdfPageCountFromUrl(blobUrl)
        } finally {
          URL.revokeObjectURL(blobUrl)
        }
      }

      const response = await fetch(apiPath("/api/quick-analysis"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quickAnalysisId,
          organizationId,
          fileName: file.name,
          storagePath,
          mediaType,
          pageCount,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error || "Failed to create quick analysis")
      }

      // Stay on this spinner until the detail route replaces the page.
      // Clearing here flashes the idle upload UI while the next page loads.
      setPhase("opening")
      router.push(`/quick-analysis/${quickAnalysisId}`)
    } catch (error) {
      setPhase("idle")
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed. Please try again."
      )
    }
  }

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    event.target.value = ""
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DBFE52]/20">
            <Zap className="h-7 w-7 text-[#9ab83a]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quick AI Analysis
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload an image or PDF to run line height, spacing, and spelling checks.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file && !isBusy) void handleFile(file)
          }}
          onClick={() => {
            if (!isBusy) fileInputRef.current?.click()
          }}
          className={cn(
            "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
            isDragging
              ? "border-[#DBFE52] bg-[#DBFE52]/10"
              : "border-border hover:border-[#DBFE52]/60 hover:bg-accent/40",
            isBusy && "pointer-events-none opacity-70"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={onInputChange}
            disabled={isBusy}
          />

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isBusy ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <CloudUpload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <p className="text-base font-medium">
            {phase === "uploading"
              ? "Uploading..."
              : phase === "opening"
                ? "Opening..."
                : "Drop your file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <FileImage className="h-3.5 w-3.5" />
              PNG, JPG, WebP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              PDF
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Max {MAX_FILE_MB}MB
            </span>
          </div>

          {!isBusy && (
            <Button type="button" className="mt-6" variant="secondary">
              <Upload className="mr-2 h-4 w-4" />
              Choose file
            </Button>
          )}
        </div>

        {errorMessage && (
          <p className="mt-4 text-center text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}
