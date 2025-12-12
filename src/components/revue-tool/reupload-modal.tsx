"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Feedback } from "@/types/revue-tool"

interface ReuploadModalProps {
  isOpen: boolean
  onClose: () => void
  feedbacks: Feedback[]
  onConfirm: (completedFeedbackIds: string[]) => void
}

export function ReuploadModal({
  isOpen,
  onClose,
  feedbacks,
  onConfirm,
}: ReuploadModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(feedbacks.filter(f => f.is_completed).map(f => f.id))
  )

  if (!isOpen) return null

  const handleCheckboxChange = (feedbackId: string) => {
    setCheckedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId)
      } else {
        newSet.add(feedbackId)
      }
      return newSet
    })
  }

  const handleNext = () => {
    onConfirm(Array.from(checkedIds))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-card rounded-lg shadow-xl w-[420px] max-h-[80vh] flex flex-col border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Upload new file</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please check all the comments which are completed before uploading new document.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Uncheck comment will be shown as undone comments.
            </p>
          </div>

          {/* Feedback list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {feedbacks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No feedbacks to review</p>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((feedback) => (
                  <label
                    key={feedback.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      checkedIds.has(feedback.id)
                        ? "bg-accent border-border"
                        : "bg-card border-border hover:bg-accent"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checkedIds.has(feedback.id)}
                      onChange={() => handleCheckboxChange(feedback.id)}
                      className="mt-1 w-4 h-4 rounded border-input text-[#334AC0] focus:ring-[#334AC0]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-foreground">
                          Feedback {feedback.feedback_number}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {feedback.user_name} ( {feedback.user_role === "client" ? "Client" : "Designer"} )
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {feedback.content}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              className="bg-[#DBFE52] text-black hover:bg-[#c9eb42]"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
