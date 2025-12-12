"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { CommentThread } from "./comment-thread"
import { ReplyInput } from "./reply-input"
import type { Feedback } from "@/types/revue-tool"

interface FeedbackCardProps {
  feedback: Feedback
  isHighlighted?: boolean
  isExpanded?: boolean
  onMarkerClick?: (markerId: string) => void
  onReply: (feedbackId: string, content: string) => void
  onDelete: (feedbackId: string) => void
  onToggleComplete: (feedbackId: string, isCompleted: boolean) => void
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  return `${Math.floor(diffInSeconds / 86400)}d`
}

export function FeedbackCard({
  feedback,
  isHighlighted,
  onReply,
  onDelete,
  onToggleComplete,
}: FeedbackCardProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Default to expanded

  const handleReply = (content: string) => {
    onReply(feedback.id, content)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      onDelete(feedback.id)
    }
  }

  const feedbackLabel = feedback.feedback_type === "drawing" ? "Drawing" : "Feedback"

  return (
    <div
      id={`feedback-${feedback.id}`}
      className={cn(
        "rounded-xl border border-border overflow-hidden transition-all duration-200 bg-card",
        isHighlighted && "ring-2 ring-[#334AC0] shadow-md"
      )}
    >
      {/* Header bar - clickable */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-3.5 flex items-center justify-between hover:bg-primary/90 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          {/* Completion checkbox */}
          <Checkbox
            checked={feedback.is_completed || false}
            onCheckedChange={(checked) => {
              onToggleComplete(feedback.id, checked as boolean)
            }}
            className="border-primary-foreground data-[state=checked]:bg-[#DBFE52] data-[state=checked]:border-[#DBFE52] data-[state=checked]:text-black"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-2 flex-1"
          >
            <span className={cn(
              "font-semibold text-sm",
              feedback.is_completed && "line-through opacity-70"
            )}>{feedbackLabel} : {feedback.feedback_number}</span>
            <span className={cn(
              "material-symbols-outlined text-lg transition-transform duration-200",
              isExpanded ? "rotate-180" : "rotate-0"
            )}>
              keyboard_arrow_down
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">
            {feedback.user_name} ( {feedback.user_role === "client" ? "Client" : "Designer"} ) {formatTimeAgo(feedback.created_at)}
          </span>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-destructive/20 rounded transition-colors"
            title="Delete feedback"
          >
            <span className="material-symbols-outlined text-lg opacity-70 hover:text-destructive">delete</span>
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={cn(
        "transition-all duration-200 overflow-hidden",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-4">
          {/* Feedback text with comment icon */}
          <div className="flex gap-3 mb-4">
            <p className="flex-1 text-sm text-foreground leading-relaxed">{feedback.content}</p>
            <span className="shrink-0 text-muted-foreground">
              <span className="material-symbols-outlined text-xl">comment</span>
            </span>
          </div>

          {/* Comments thread */}
          {feedback.comments && feedback.comments.length > 0 && (
            <CommentThread comments={feedback.comments} />
          )}

          {/* Reply input */}
          <ReplyInput onSubmit={handleReply} />
        </div>
      </div>
    </div>
  )
}
