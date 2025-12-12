"use client"

import { cn } from "@/lib/utils"
import type { CommentMarker } from "@/types/revue-tool"

interface CommentMarkersLayerProps {
  markers: CommentMarker[]
  highlightedMarkerId?: string | null
  onMarkerClick: (markerId: string) => void
}

export function CommentMarkersLayer({
  markers,
  highlightedMarkerId,
  onMarkerClick,
}: CommentMarkersLayerProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      {markers.map((marker) => (
        <button
          key={marker.id}
          onClick={(e) => {
            e.stopPropagation()
            onMarkerClick(marker.id)
          }}
          className={cn(
            "absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2",
            "min-w-7 h-7 px-1.5 rounded-full flex items-center justify-center text-xs font-bold",
            "transition-all duration-200 cursor-pointer shadow-md",
            highlightedMarkerId === marker.id
              ? "bg-[#334AC0] text-white scale-125 ring-2 ring-[#334AC0]/30"
              : "bg-[#DBFE52] text-black hover:scale-110"
          )}
          style={{
            left: `${marker.x_position}%`,
            top: `${marker.y_position}%`,
          }}
          title="Comment"
        >
          {marker.marker_number}
        </button>
      ))}
    </div>
  )
}
