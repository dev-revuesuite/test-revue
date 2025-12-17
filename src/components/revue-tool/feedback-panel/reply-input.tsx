"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Comment } from "@/types/revue-tool"

interface ReplyInputProps {
  onSubmit: (content: string, quotedComment?: Comment) => void
  placeholder?: string
  replyingTo?: Comment | null
  onCancelReply?: () => void
}

export function ReplyInput({
  onSubmit,
  placeholder = "Write your comment...",
  replyingTo,
  onCancelReply
}: ReplyInputProps) {
  const [content, setContent] = useState("")

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim(), replyingTo || undefined)
      setContent("")
      onCancelReply?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape" && replyingTo) {
      onCancelReply?.()
    }
  }

  return (
    <div className="mt-4 pt-3 border-t border-border">
      {/* Reply quote preview */}
      {replyingTo && (
        <div className="flex items-start gap-2 mb-2 p-2 bg-muted/50 rounded-lg border-l-2 border-[#DBFE52]">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground">
              Replying to {replyingTo.user_name}
            </span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {replyingTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Reply to ${replyingTo.user_name}...` : placeholder}
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
    </div>
  )
}
