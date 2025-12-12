"use client"

import { useState, useCallback } from "react"
import type { ImageViewerState, ActiveTool } from "@/types/revue-tool"

const defaultState: ImageViewerState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  isFullscreen: false,
  activeTool: "select",
  brushColor: "#FF0000",
  brushSize: 3,
}

export function useImageViewer(initialState?: Partial<ImageViewerState>) {
  const [state, setState] = useState<ImageViewerState>({
    ...defaultState,
    ...initialState,
  })

  const zoomIn = useCallback(() => {
    setState((s) => ({ ...s, zoom: Math.min(s.zoom + 0.25, 4) }))
  }, [])

  const zoomOut = useCallback(() => {
    setState((s) => ({ ...s, zoom: Math.max(s.zoom - 0.25, 0.5) }))
  }, [])

  const resetZoom = useCallback(() => {
    setState((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    setState((s) => ({ ...s, isFullscreen: !s.isFullscreen }))
  }, [])

  const setTool = useCallback((tool: ActiveTool) => {
    setState((s) => ({ ...s, activeTool: tool }))
  }, [])

  const setBrushColor = useCallback((color: string) => {
    setState((s) => ({ ...s, brushColor: color }))
  }, [])

  const setBrushSize = useCallback((size: number) => {
    setState((s) => ({ ...s, brushSize: size }))
  }, [])

  const setPan = useCallback((x: number, y: number) => {
    setState((s) => ({ ...s, panX: x, panY: y }))
  }, [])

  return {
    state,
    setState,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    setTool,
    setBrushColor,
    setBrushSize,
    setPan,
  }
}
