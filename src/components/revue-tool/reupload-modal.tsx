"use client"

import { useState, useCallback } from "react"
import { Upload, X, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Feedback } from "@/types/revue-tool"

interface ReuploadModalProps {
  isOpen: boolean
  onClose: () => void
  feedbacks: Feedback[]
  onConfirm: (completedFeedbackIds: string[], file: File) => void
}

type Step = "review" | "upload"

export function ReuploadModal({
  isOpen,
  onClose,
  feedbacks,
  onConfirm,
}: ReuploadModalProps) {
  const [step, setStep] = useState<Step>("review")
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(feedbacks.filter(f => f.is_completed).map(f => f.id))
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // All hooks must be called before any conditional returns
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

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
    setStep("upload")
  }

  const handleBack = () => {
    setStep("review")
  }

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onConfirm(Array.from(checkedIds), selectedFile)
      handleClose()
    }
  }

  const handleClose = () => {
    setStep("review")
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-card rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {step === "review" ? (
            <>
              {/* Header - Step 1 */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-[#DBFE52] text-black text-xs font-semibold">1</div>
                  <h2 className="text-lg font-semibold text-foreground">Review Feedbacks</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check all the feedbacks that are completed before uploading the new iteration.
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Unchecked feedbacks will be carried over as pending.
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
                            ? "bg-accent border-[#DBFE52]/30"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checkedIds.has(feedback.id)}
                          onChange={() => handleCheckboxChange(feedback.id)}
                          className="mt-1 w-4 h-4 rounded border-input accent-[#DBFE52]"
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

              {/* Footer - Step 1 */}
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-[#DBFE52] text-black hover:bg-[#c9eb42]"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Header - Step 2 */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-[#DBFE52] text-black text-xs font-semibold">2</div>
                  <h2 className="text-lg font-semibold text-foreground">Upload New Iteration</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload the updated design file to create a new iteration.
                </p>
              </div>

              {/* Upload area */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {!selectedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center",
                      isDragging
                        ? "border-[#DBFE52] bg-[#DBFE52]/5"
                        : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className={cn(
                        "size-16 rounded-full flex items-center justify-center transition-colors",
                        isDragging ? "bg-[#DBFE52]/20" : "bg-muted"
                      )}>
                        <Upload className={cn(
                          "size-8 transition-colors",
                          isDragging ? "text-[#DBFE52]" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isDragging ? "Drop your image here" : "Drag and drop your image here"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          or click to browse
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ImageIcon className="size-4" />
                        <span>PNG, JPG, WEBP up to 10MB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Preview */}
                    <div className="relative rounded-xl border border-border overflow-hidden bg-muted/30">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-48 object-contain"
                        />
                      )}
                      <button
                        onClick={handleRemoveFile}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        <X className="size-4 text-white" />
                      </button>
                    </div>
                    {/* File info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="size-10 rounded-lg bg-[#DBFE52]/20 flex items-center justify-center">
                        <CheckCircle2 className="size-5 text-[#DBFE52]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <X className="size-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Step 2 */}
              <div className="px-6 py-4 border-t border-border flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    className="bg-[#DBFE52] text-black hover:bg-[#c9eb42] disabled:opacity-50"
                  >
                    Create Iteration
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
