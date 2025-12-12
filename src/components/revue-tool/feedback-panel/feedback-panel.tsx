"use client"

import { FeedbackCard } from "./feedback-card"
import type { Feedback } from "@/types/revue-tool"

interface FeedbackPanelProps {
  feedbacks: Feedback[]
  highlightedFeedbackId?: string | null
  onMarkerClick: (markerId: string) => void
  onReply: (feedbackId: string, content: string) => void
  onDelete: (feedbackId: string) => void
  onToggleComplete: (feedbackId: string, isCompleted: boolean) => void
}

export function FeedbackPanel({
  feedbacks,
  highlightedFeedbackId,
  onMarkerClick,
  onReply,
  onDelete,
  onToggleComplete,
}: FeedbackPanelProps) {
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-foreground">Client feedback</h2>
        <span className="text-sm text-muted-foreground">
          Total Feedback: {feedbacks.length}
        </span>
      </div>

      {/* Feedback list - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              isHighlighted={highlightedFeedbackId === feedback.id}
              isExpanded={highlightedFeedbackId === feedback.id}
              onMarkerClick={onMarkerClick}
              onReply={onReply}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))}
          {feedbacks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No feedback yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
