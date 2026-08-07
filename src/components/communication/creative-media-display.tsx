"use client"

import { cn } from "@/lib/utils"
import type { MediaType } from "@/lib/media-type"
import { PdfPageViewer, type PdfPageViewerReadyPayload } from "./pdf-page-viewer"

interface CreativeMediaDisplayProps {
  mediaType: MediaType
  url: string
  iterationId?: string | null
  page?: number
  displayWidth?: number
  alt?: string
  className?: string
  onPdfReady?: (payload: PdfPageViewerReadyPayload) => void
  onPdfError?: (error: Error) => void
  /** Called when image loads or PDF page finishes rendering (overlay layout sync). */
  onLayoutChange?: () => void
}

/** Renders image or PDF page for Revue canvas (matches prior img layout classes). */
export function CreativeMediaDisplay({
  mediaType,
  url,
  iterationId,
  page = 1,
  displayWidth,
  alt = "Creative Preview",
  className,
  onPdfReady,
  onPdfError,
  onLayoutChange,
}: CreativeMediaDisplayProps) {
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-sm min-h-[280px]",
          className
        )}
        data-creative-media
      >
        No preview
      </div>
    )
  }

  if (mediaType === "pdf") {
    return (
      <PdfPageViewer
        url={url}
        iterationId={iterationId}
        page={page}
        displayWidth={displayWidth}
        className={className}
        onReady={onPdfReady}
        onError={onPdfError}
        onPageRendered={onLayoutChange}
      />
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      className={cn("max-w-none select-none h-auto", className)}
      draggable={false}
      data-creative-media
      data-creative-media-image
      onLoad={() => onLayoutChange?.()}
    />
  )
}
