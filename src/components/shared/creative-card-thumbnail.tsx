"use client"

import type { ComponentType } from "react"
import { FileText, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { isPdfUrl, type MediaType } from "@/lib/media-type"

export interface CreativeCardThumbnailProps {
  name: string
  type: "image" | "video" | "document" | "design"
  thumbnailUrl?: string
  mediaType?: MediaType
  pageCount?: number | null
  typeIcon?: ComponentType<{ className?: string }>
  className?: string
  imageClassName?: string
  showVideoOverlay?: boolean
}

export function CreativeCardThumbnail({
  name,
  type,
  thumbnailUrl = "",
  mediaType,
  pageCount,
  typeIcon: TypeIcon = FileText,
  className,
  imageClassName,
  showVideoOverlay = true,
}: CreativeCardThumbnailProps) {
  const isPdf =
    mediaType === "pdf" ||
    type === "document" ||
    (thumbnailUrl ? isPdfUrl(thumbnailUrl) : false)

  const showImage =
    thumbnailUrl && !isPdf && (type === "image" || type === "video" || type === "design")

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumbnailUrl}
          alt={name}
          className={cn(
            "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
            imageClassName
          )}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f8f9ff] via-white to-[#f0f4ff] dark:from-[#111] dark:via-[#0a0a0a] dark:to-[#0d0f1a]">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex flex-col items-center gap-2 px-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#5C6ECD]/10 flex items-center justify-center">
              <TypeIcon className="w-6 h-6 text-[#5C6ECD]/80" />
            </div>
            {isPdf ? (
              <>
                <span className="text-xs font-semibold text-[#5C6ECD]">PDF</span>
                {pageCount != null && pageCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {pageCount === 1 ? "1 page" : `${pageCount} pages`}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60 font-medium">
                No preview
              </span>
            )}
          </div>
        </div>
      )}
      {showVideoOverlay && type === "video" && showImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-foreground ml-1" />
          </div>
        </div>
      )}
    </div>
  )
}
