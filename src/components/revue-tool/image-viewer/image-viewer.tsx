"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Toolbar } from "./toolbar"
import { ZoomControls } from "./zoom-controls"
import { CanvasLayer } from "./canvas-layer"
import { CommentMarkersLayer } from "./comment-markers-layer"
import { NewCommentPopover } from "./new-comment-popover"
import type { ActiveTool, CommentMarker, DrawingPath } from "@/types/revue-tool"

interface ImageViewerProps {
  imageUrl: string
  originalImageUrl?: string // Original image for comparison
  markers: CommentMarker[]
  drawingPaths?: DrawingPath[] // Drawing paths from feedbacks
  highlightedMarkerId?: string | null
  onMarkerClick: (markerId: string) => void
  onAddCommentMarker: (position: { x: number; y: number }, content: string) => void
  onAddDrawingFeedback: (drawingPath: DrawingPath, markerPosition: { x: number; y: number }, content: string) => void
  onClearHighlight: () => void
}

export function ImageViewer({
  imageUrl,
  originalImageUrl,
  markers,
  drawingPaths = [],
  highlightedMarkerId,
  onMarkerClick,
  onAddCommentMarker,
  onAddDrawingFeedback,
  onClearHighlight,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [zoom, setZoom] = useState(1)
  const [activeTool, setActiveTool] = useState<ActiveTool>("select")
  const [brushColor] = useState("#FF0000")
  const [brushSize] = useState(3)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [showOriginal, setShowOriginal] = useState(false)

  // New comment popover state
  const [pendingComment, setPendingComment] = useState<{ x: number; y: number } | null>(null)

  // Pending drawing state
  const [pendingDrawing, setPendingDrawing] = useState<{
    drawingPath: DrawingPath
    markerPosition: { x: number; y: number }
  } | null>(null)

  // Compare handlers - show original image while holding
  const handleCompareStart = useCallback(() => {
    if (originalImageUrl) {
      setShowOriginal(true)
    }
  }, [originalImageUrl])

  const handleCompareEnd = useCallback(() => {
    setShowOriginal(false)
  }, [])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const handleToolChange = (tool: ActiveTool) => {
    setActiveTool(tool)
    // Clear highlight when changing tools
    onClearHighlight()
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.min(Math.max(z + delta, 0.5), 4))
    }
  }, [])

  const handleAddCommentPosition = useCallback((position: { x: number; y: number }) => {
    setPendingComment(position)
  }, [])

  const handleCommentSubmit = useCallback((content: string) => {
    if (pendingDrawing && content.trim()) {
      // Submit as drawing feedback
      onAddDrawingFeedback(pendingDrawing.drawingPath, pendingDrawing.markerPosition, content)
      setPendingDrawing(null)
      setActiveTool("select")
    } else if (pendingComment && content.trim()) {
      // Submit as comment feedback
      onAddCommentMarker(pendingComment, content)
      setPendingComment(null)
      setActiveTool("select")
    }
  }, [pendingComment, pendingDrawing, onAddCommentMarker, onAddDrawingFeedback])

  const handleCommentCancel = useCallback(() => {
    setPendingComment(null)
    setPendingDrawing(null)
  }, [])

  const handleDrawingComplete = useCallback((drawingPath: DrawingPath, markerPosition: { x: number; y: number }) => {
    setPendingDrawing({ drawingPath, markerPosition })
  }, [])

  // Track image size for canvas sizing
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      })
    }
  }, [])

  // Update image size on resize
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        setImageSize({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-card rounded-lg border border-border overflow-hidden"
      onWheel={handleWheel}
    >
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onCompareStart={handleCompareStart}
        onCompareEnd={handleCompareEnd}
        hasOriginalImage={!!originalImageUrl}
      />

      {/* Image container - centered with zoom */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={showOriginal && originalImageUrl ? originalImageUrl : imageUrl}
            alt={showOriginal ? "Original design" : "Design preview"}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            onLoad={handleImageLoad}
          />

          {/* Original image indicator */}
          {showOriginal && (
            <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium">
              Original Image
            </div>
          )}

          {/* Canvas layer - positioned on top of image */}
          {!showOriginal && (
            <CanvasLayer
              activeTool={activeTool}
              brushColor={brushColor}
              brushSize={brushSize}
              zoom={1} // No need for zoom adjustment since canvas is inside zoomed container
              drawingPaths={drawingPaths}
              pendingDrawingPath={pendingDrawing?.drawingPath}
              onAddCommentMarker={handleAddCommentPosition}
              onDrawingComplete={handleDrawingComplete}
            />
          )}

          {/* Markers positioned relative to image - hidden during compare */}
          {!showOriginal && (
            <CommentMarkersLayer
              markers={markers}
              highlightedMarkerId={highlightedMarkerId}
              onMarkerClick={onMarkerClick}
            />
          )}
        </div>
      </div>

      {/* New Comment/Drawing Popover */}
      {(pendingComment || pendingDrawing) && (
        <NewCommentPopover
          position={pendingDrawing?.markerPosition || pendingComment!}
          onSubmit={handleCommentSubmit}
          onCancel={handleCommentCancel}
          isDrawing={!!pendingDrawing}
        />
      )}

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFullscreen={handleFullscreen}
      />
    </div>
  )
}
