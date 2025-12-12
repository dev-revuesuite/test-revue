"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { ActiveTool, DrawingPath } from "@/types/revue-tool"

interface Point {
  x: number // percentage 0-100
  y: number // percentage 0-100
}

interface CanvasLayerProps {
  activeTool: ActiveTool
  brushColor: string
  brushSize: number
  zoom: number
  drawingPaths?: DrawingPath[] // Drawing paths from feedbacks
  onAddCommentMarker?: (position: { x: number; y: number }) => void
  onDrawingComplete?: (drawingPath: DrawingPath, markerPosition: { x: number; y: number }) => void
  pendingDrawingPath?: DrawingPath | null // Temporary drawing waiting for feedback input
}

export function CanvasLayer({
  activeTool,
  brushColor,
  brushSize,
  zoom,
  drawingPaths = [],
  onAddCommentMarker,
  onDrawingComplete,
  pendingDrawingPath,
}: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const currentPathRef = useRef<Point[]>([])

  // Get coordinates as percentages of canvas size
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    // Return percentage coordinates (0-100)
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Helper to convert percentage to pixel coordinates
    const toPixel = (point: { x: number; y: number }) => ({
      x: (point.x / 100) * canvasWidth,
      y: (point.y / 100) * canvasHeight,
    })

    // Helper to draw a path (using percentage coordinates)
    const drawPath = (path: DrawingPath) => {
      if (path.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = path.color
      ctx.lineWidth = path.size
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      const firstPoint = toPixel(path.points[0])
      ctx.moveTo(firstPoint.x, firstPoint.y)
      path.points.forEach((point) => {
        const pixelPoint = toPixel(point)
        ctx.lineTo(pixelPoint.x, pixelPoint.y)
      })
      ctx.stroke()
    }

    // Draw all saved paths from feedbacks
    drawingPaths.forEach(drawPath)

    // Draw pending drawing path (waiting for feedback input)
    if (pendingDrawingPath) {
      drawPath(pendingDrawingPath)
    }

    // Draw current path being drawn
    if (currentPathRef.current.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = brushColor
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      const firstPoint = toPixel(currentPathRef.current[0])
      ctx.moveTo(firstPoint.x, firstPoint.y)
      currentPathRef.current.forEach((point) => {
        const pixelPoint = toPixel(point)
        ctx.lineTo(pixelPoint.x, pixelPoint.y)
      })
      ctx.stroke()
    }
  }, [drawingPaths, pendingDrawingPath, brushColor, brushSize])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
        redrawCanvas()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [redrawCanvas])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "comment" && onAddCommentMarker) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      onAddCommentMarker({ x, y })
      return
    }

    if (activeTool !== "draw") return

    setIsDrawing(true)
    const coords = getCanvasCoordinates(e)
    currentPathRef.current = [coords]
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw") return

    const coords = getCanvasCoordinates(e)
    currentPathRef.current.push(coords)
    redrawCanvas()
  }

  const handleMouseUp = () => {
    if (!isDrawing || activeTool !== "draw") return

    setIsDrawing(false)
    if (currentPathRef.current.length > 1) {
      const newPath: DrawingPath = {
        points: [...currentPathRef.current],
        color: brushColor,
        size: brushSize,
      }

      // Calculate center point of the drawing for marker position
      const points = currentPathRef.current
      const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length
      const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length

      // Trigger callback to open feedback popover
      if (onDrawingComplete) {
        onDrawingComplete(newPath, { x: avgX, y: avgY })
      }
    }
    currentPathRef.current = []
  }

  const cursorStyle = activeTool === "draw"
    ? "crosshair"
    : activeTool === "comment"
      ? "crosshair"
      : "default"

  // Only capture pointer events when draw or comment tool is active
  const shouldCaptureEvents = activeTool === "draw" || activeTool === "comment"

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="absolute inset-0 z-[5]"
      style={{
        cursor: cursorStyle,
        pointerEvents: shouldCaptureEvents ? "auto" : "none"
      }}
    />
  )
}
