"use client"

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFullscreen: () => void
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: ZoomControlsProps) {
  return (
    <>
      {/* Zoom buttons - bottom left */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0 bg-card rounded-lg shadow-lg border-2 border-border overflow-hidden">
        <button
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          className="flex items-center justify-center w-10 h-10 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed border-r-2 border-border transition-colors"
        >
          <span className="material-symbols-outlined text-xl text-foreground">zoom_out</span>
        </button>
        <button
          onClick={onZoomIn}
          disabled={zoom >= 4}
          className="flex items-center justify-center w-10 h-10 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-xl text-foreground">zoom_in</span>
        </button>
      </div>

      {/* Fullscreen button - bottom right */}
      <button
        onClick={onFullscreen}
        className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-10 h-10 bg-card rounded-lg shadow-lg border-2 border-border hover:bg-accent transition-colors"
      >
        <span className="material-symbols-outlined text-xl text-foreground">zoom_out_map</span>
      </button>
    </>
  )
}
