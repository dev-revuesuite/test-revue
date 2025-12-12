"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface NewCommentPopoverProps {
  position: { x: number; y: number }
  onSubmit: (content: string) => void
  onCancel: () => void
  isDrawing?: boolean
}

export function NewCommentPopover({ position, onSubmit, onCancel, isDrawing }: NewCommentPopoverProps) {
  const [content, setContent] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Focus the input when popover opens
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20"
        onClick={onCancel}
      />

      {/* Popover */}
      <div
        className="absolute z-30 bg-card rounded-lg shadow-xl border-2 border-border p-4 w-72"
        style={{
          left: `${Math.min(position.x, 70)}%`,
          top: `${Math.min(position.y, 70)}%`,
          transform: "translate(-50%, 10px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow pointing to marker position */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-l-2 border-t-2 border-border rotate-45"
        />

        <div className="relative">
          <h4 className="text-sm font-semibold mb-2 text-foreground">
            {isDrawing ? "Add Drawing Feedback" : "Add Feedback"}
          </h4>
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDrawing ? "Describe your drawing annotation..." : "Enter your feedback..."}
            className="w-full h-24 px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring bg-background text-foreground"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="bg-[#DBFE52] text-black hover:bg-[#c9eb42]"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
