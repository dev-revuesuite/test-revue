"use client"

import { useState } from "react"

interface ReplyInputProps {
  onSubmit: (content: string) => void
  placeholder?: string
}

export function ReplyInput({ onSubmit, placeholder = "Write your comment..." }: ReplyInputProps) {
  const [content, setContent] = useState("")

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim())
      setContent("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 text-sm bg-muted border border-input rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground text-foreground"
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-10 h-10 flex items-center justify-center bg-[#DBFE52] hover:bg-[#c9eb42] text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined text-xl">send</span>
      </button>
    </div>
  )
}
