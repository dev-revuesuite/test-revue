"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { ActiveTool } from "@/types/revue-tool"

interface ToolbarProps {
  activeTool: ActiveTool
  onToolChange: (tool: ActiveTool) => void
  onCompareStart: () => void
  onCompareEnd: () => void
  hasOriginalImage?: boolean
}

export function Toolbar({ activeTool, onToolChange, onCompareStart, onCompareEnd, hasOriginalImage }: ToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !toolbar) return

      const newX = e.clientX - offsetRef.current.x
      const newY = e.clientY - offsetRef.current.y

      positionRef.current = { x: newX, y: newY }
      toolbar.style.transform = `translate(calc(-50% + ${newX}px), ${newY}px)`
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the drag handle area
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      isDraggingRef.current = true
      offsetRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      }
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    }
  }

  return (
    <div
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      className="absolute top-4 left-1/2 z-10 flex items-center gap-0 bg-card rounded-lg shadow-lg border-2 border-border overflow-hidden cursor-default"
      style={{
        transform: 'translate(-50%, 0)',
      }}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        className="flex items-center justify-center px-2 py-3 cursor-grab active:cursor-grabbing border-r-2 border-border hover:bg-accent"
      >
        <span className="material-symbols-outlined text-xl text-muted-foreground">drag_indicator</span>
      </div>
      <button
        onClick={() => onToolChange(activeTool === "draw" ? "select" : "draw")}
        className="flex flex-col items-center justify-center px-4 py-2.5 gap-1 transition-colors bg-card hover:bg-accent"
      >
        <div className={cn(
          "flex flex-col items-center justify-center px-3 py-2 gap-1 rounded-md transition-all",
          activeTool === "draw"
            ? "border-2 border-foreground"
            : "border-2 border-transparent"
        )}>
          <span className="material-symbols-outlined text-2xl text-foreground">draw</span>
          <span className="text-xs font-medium text-foreground">Draw</span>
        </div>
      </button>
      <button
        onClick={() => onToolChange(activeTool === "comment" ? "select" : "comment")}
        className="flex flex-col items-center justify-center px-4 py-2.5 gap-1 transition-colors bg-card hover:bg-accent"
      >
        <div className={cn(
          "flex flex-col items-center justify-center px-3 py-2 gap-1 rounded-md transition-all",
          activeTool === "comment"
            ? "border-2 border-foreground"
            : "border-2 border-transparent"
        )}>
          <span className="material-symbols-outlined text-2xl text-foreground">comment</span>
          <span className="text-xs font-medium text-foreground">Comment</span>
        </div>
      </button>
      <button
        onMouseDown={hasOriginalImage ? onCompareStart : undefined}
        onMouseUp={hasOriginalImage ? onCompareEnd : undefined}
        onMouseLeave={hasOriginalImage ? onCompareEnd : undefined}
        onTouchStart={hasOriginalImage ? onCompareStart : undefined}
        onTouchEnd={hasOriginalImage ? onCompareEnd : undefined}
        className={cn(
          "flex flex-col items-center justify-center px-4 py-2.5 gap-1 transition-colors",
          hasOriginalImage
            ? "bg-card hover:bg-accent cursor-pointer"
            : "bg-muted cursor-not-allowed opacity-50"
        )}
        disabled={!hasOriginalImage}
        title={hasOriginalImage ? "Hold to compare with original" : "No original image available"}
      >
        <div className="flex flex-col items-center justify-center px-3 py-2 gap-1 rounded-md border-2 border-transparent">
          <span className="material-symbols-outlined text-2xl text-foreground">compare</span>
          <span className="text-xs font-medium text-foreground">Compare</span>
        </div>
      </button>
    </div>
  )
}
