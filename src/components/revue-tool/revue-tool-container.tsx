"use client"

import { useState, useCallback } from "react"
import { RevueHeader } from "./revue-header"
import { IterationTabs } from "./iteration-tabs"
import { ImageViewer } from "./image-viewer/image-viewer"
import { FeedbackPanel } from "./feedback-panel/feedback-panel"
import { ReuploadModal } from "./reupload-modal"
import type { Brief, Iteration, Feedback, CommentMarker } from "@/types/revue-tool"

// Mock data for demonstration
const mockBrief: Brief = {
  id: "1",
  title: "Project Name's Brief",
  share_link: "https://revue.app/share/abc123",
  original_image_url: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800", // Original reference image for comparison
  created_at: new Date().toISOString(),
}

const mockIterations: Iteration[] = [
  {
    id: "1",
    brief_id: "1",
    iteration_number: 5,
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    brief_id: "1",
    iteration_number: 4,
    image_url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    brief_id: "1",
    iteration_number: 3,
    image_url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    brief_id: "1",
    iteration_number: 2,
    image_url: "https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=800",
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    brief_id: "1",
    iteration_number: 1,
    image_url: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800",
    created_at: new Date().toISOString(),
  },
]

const mockFeedbacks: Feedback[] = [
  // Iteration 5 feedbacks
  {
    id: "5-1",
    iteration_id: "1",
    feedback_number: "5.1",
    feedback_type: "comment",
    content:
      "Change the font size from 12 points to 18 points. So that's why we can bigger font size and better visibility. Now user can add 2 more pictures.",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 75,
    marker_y: 25,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: "c1",
        feedback_id: "5-1",
        content: "It is not possible.",
        user_name: "Robin Hood",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "c1b",
        feedback_id: "5-1",
        content: "Why?",
        user_name: "You",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "c2",
        feedback_id: "5-1",
        content: "18 pixel font size is too big for the screen.",
        user_name: "Robin Hood",
        quoted_text: "Why?",
        quoted_user: "You",
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "c3",
        feedback_id: "5-1",
        content: "Yes he is right.",
        user_name: "Suniana",
        quoted_text: "@Robin Hood",
        quoted_user: "Robin Hood",
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "5-2",
    iteration_id: "1",
    feedback_number: "5.2",
    feedback_type: "comment",
    content:
      "The header image needs to be more vibrant. Can we try a different color scheme?",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 30,
    marker_y: 60,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  {
    id: "5-3",
    iteration_id: "1",
    feedback_number: "5.3",
    feedback_type: "comment",
    content: "The color scheme looks great but can we try a darker shade of blue for the header?",
    user_name: "Alex",
    user_role: "client",
    marker_x: 50,
    marker_y: 15,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: "c4",
        feedback_id: "5-3",
        content: "I'll work on this tomorrow.",
        user_name: "You",
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "5-4",
    iteration_id: "1",
    feedback_number: "5.4",
    feedback_type: "comment",
    content: "Please add more whitespace between sections for better readability.",
    user_name: "Jordan",
    user_role: "designer",
    marker_x: 20,
    marker_y: 80,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  // Iteration 4 feedbacks
  {
    id: "4-1",
    iteration_id: "2",
    feedback_number: "4.1",
    feedback_type: "comment",
    content: "The navigation menu is too small on mobile devices. Please increase the tap target size.",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 10,
    marker_y: 20,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: "c5",
        feedback_id: "4-1",
        content: "Fixed in the next iteration!",
        user_name: "You",
        created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "4-2",
    iteration_id: "2",
    feedback_number: "4.2",
    feedback_type: "comment",
    content: "Add a loading spinner when the page is fetching data.",
    user_name: "Alex",
    user_role: "client",
    marker_x: 50,
    marker_y: 50,
    created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  {
    id: "4-3",
    iteration_id: "2",
    feedback_number: "4.3",
    feedback_type: "comment",
    content: "The button hover states need more contrast.",
    user_name: "Jordan",
    user_role: "designer",
    marker_x: 80,
    marker_y: 70,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  // Iteration 3 feedbacks
  {
    id: "3-1",
    iteration_id: "3",
    feedback_number: "3.1",
    feedback_type: "comment",
    content: "The logo placement feels off. Can we center it in the header?",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 15,
    marker_y: 10,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: "c6",
        feedback_id: "3-1",
        content: "Centering might break the layout on tablet.",
        user_name: "Robin Hood",
        created_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "c7",
        feedback_id: "3-1",
        content: "Let's try left alignment then.",
        user_name: "You",
        created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "3-2",
    iteration_id: "3",
    feedback_number: "3.2",
    feedback_type: "comment",
    content: "Footer links are hard to read. Increase contrast.",
    user_name: "Alex",
    user_role: "client",
    marker_x: 50,
    marker_y: 90,
    created_at: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  // Iteration 2 feedbacks
  {
    id: "2-1",
    iteration_id: "4",
    feedback_number: "2.1",
    feedback_type: "comment",
    content: "Initial layout looks good! Just need to work on the spacing.",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 40,
    marker_y: 40,
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
  // Iteration 1 feedbacks
  {
    id: "1-1",
    iteration_id: "5",
    feedback_number: "1.1",
    feedback_type: "comment",
    content: "First draft received. Great start! Let's iterate on the color palette.",
    user_name: "Pranjal",
    user_role: "client",
    marker_x: 50,
    marker_y: 50,
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    comments: [
      {
        id: "c8",
        feedback_id: "1-1",
        content: "Thanks! I'll prepare some color options.",
        user_name: "You",
        created_at: new Date(Date.now() - 95 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "1-2",
    iteration_id: "5",
    feedback_number: "1.2",
    feedback_type: "comment",
    content: "Consider using a different font for headings.",
    user_name: "Jordan",
    user_role: "designer",
    marker_x: 30,
    marker_y: 20,
    created_at: new Date(Date.now() - 97 * 60 * 60 * 1000).toISOString(),
    comments: [],
  },
]

interface RevueToolContainerProps {
  initialBrief?: Brief
  initialIterations?: Iteration[]
  initialFeedbacks?: Feedback[]
}

export function RevueToolContainer({
  initialBrief = mockBrief,
  initialIterations = mockIterations,
  initialFeedbacks = mockFeedbacks,
}: RevueToolContainerProps) {
  const [brief] = useState<Brief>(initialBrief)
  const [iterations] = useState<Iteration[]>(initialIterations)
  const [activeIterationId, setActiveIterationId] = useState<string>(
    initialIterations[0]?.id || ""
  )
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks)
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null)
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false)

  const activeIteration = iterations.find((i) => i.id === activeIterationId)
  const iterationFeedbacks = feedbacks.filter((f) => f.iteration_id === activeIterationId)

  // Convert feedbacks with markers to CommentMarker format with proper numbering (both comments and drawings)
  const markers: CommentMarker[] = iterationFeedbacks
    .filter((f) => f.marker_x !== undefined && f.marker_y !== undefined)
    .map((f) => ({
      id: f.id,
      iteration_id: f.iteration_id,
      x_position: f.marker_x!,
      y_position: f.marker_y!,
      marker_number: parseFloat(f.feedback_number),
    }))

  // Get all drawing paths from feedbacks
  const drawingPaths = iterationFeedbacks
    .filter((f) => f.feedback_type === "drawing" && f.drawing_paths)
    .flatMap((f) => f.drawing_paths || [])

  const handleReUpload = () => {
    setIsReuploadModalOpen(true)
  }

  const handleReuploadConfirm = useCallback((completedFeedbackIds: string[]) => {
    // Mark feedbacks as completed
    setFeedbacks((prev) =>
      prev.map((f) => ({
        ...f,
        is_completed: completedFeedbackIds.includes(f.id),
      }))
    )
    setIsReuploadModalOpen(false)
    // TODO: Trigger file upload dialog here
    console.log("Completed feedbacks:", completedFeedbackIds)
  }, [])

  const handleMarkerClick = useCallback((markerId: string) => {
    setHighlightedFeedbackId(markerId)
    // Scroll to feedback card
    setTimeout(() => {
      const element = document.getElementById(`feedback-${markerId}`)
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }, [])

  const handleAddCommentMarker = useCallback(
    (position: { x: number; y: number }, content: string) => {
      const iterationNumber = activeIteration?.iteration_number || 1
      const existingCount = iterationFeedbacks.length
      const newFeedbackNumber = `${iterationNumber}.${existingCount + 1}`

      const newFeedback: Feedback = {
        id: `${iterationNumber}-${existingCount + 1}-${Date.now()}`,
        iteration_id: activeIterationId,
        feedback_number: newFeedbackNumber,
        feedback_type: "comment",
        content: content,
        user_name: "You",
        user_role: "designer",
        marker_x: position.x,
        marker_y: position.y,
        created_at: new Date().toISOString(),
        comments: [],
      }
      setFeedbacks((prev) => [...prev, newFeedback])
      setHighlightedFeedbackId(newFeedback.id)
    },
    [activeIterationId, activeIteration, iterationFeedbacks.length]
  )

  const handleAddDrawingFeedback = useCallback(
    (drawingPath: { points: { x: number; y: number }[]; color: string; size: number }, markerPosition: { x: number; y: number }, content: string) => {
      const iterationNumber = activeIteration?.iteration_number || 1
      const existingCount = iterationFeedbacks.length
      const newFeedbackNumber = `${iterationNumber}.${existingCount + 1}`

      const newFeedback: Feedback = {
        id: `${iterationNumber}-${existingCount + 1}-${Date.now()}`,
        iteration_id: activeIterationId,
        feedback_number: newFeedbackNumber,
        feedback_type: "drawing",
        content: content,
        user_name: "You",
        user_role: "designer",
        marker_x: markerPosition.x,
        marker_y: markerPosition.y,
        drawing_paths: [drawingPath],
        created_at: new Date().toISOString(),
        comments: [],
      }
      setFeedbacks((prev) => [...prev, newFeedback])
      setHighlightedFeedbackId(newFeedback.id)
    },
    [activeIterationId, activeIteration, iterationFeedbacks.length]
  )

  const handleDeleteFeedback = useCallback((feedbackId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId))
    if (highlightedFeedbackId === feedbackId) {
      setHighlightedFeedbackId(null)
    }
  }, [highlightedFeedbackId])

  const handleClearHighlight = useCallback(() => {
    setHighlightedFeedbackId(null)
  }, [])

  const handleReply = useCallback((feedbackId: string, content: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      feedback_id: feedbackId,
      content,
      user_name: "You",
      created_at: new Date().toISOString(),
    }
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? { ...f, comments: [...(f.comments || []), newComment] }
          : f
      )
    )
  }, [])

  const handleToggleComplete = useCallback((feedbackId: string, isCompleted: boolean) => {
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? { ...f, is_completed: isCompleted }
          : f
      )
    )
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      <RevueHeader
        briefTitle={brief.title}
        shareLink={brief.share_link}
        onReUpload={handleReUpload}
      />

      <IterationTabs
        iterations={iterations}
        activeIterationId={activeIterationId}
        onIterationChange={setActiveIterationId}
      />

      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left panel - Image Viewer (50%) */}
        <div className="w-1/2 min-w-0">
          <ImageViewer
            imageUrl={activeIteration?.image_url || ""}
            originalImageUrl={brief.original_image_url}
            markers={markers}
            drawingPaths={drawingPaths}
            highlightedMarkerId={highlightedFeedbackId}
            onMarkerClick={handleMarkerClick}
            onAddCommentMarker={handleAddCommentMarker}
            onAddDrawingFeedback={handleAddDrawingFeedback}
            onClearHighlight={handleClearHighlight}
          />
        </div>

        {/* Right panel - Feedback (50%) */}
        <div className="w-1/2 min-w-0 h-full">
          <FeedbackPanel
            feedbacks={iterationFeedbacks}
            highlightedFeedbackId={highlightedFeedbackId}
            onMarkerClick={handleMarkerClick}
            onReply={handleReply}
            onDelete={handleDeleteFeedback}
            onToggleComplete={handleToggleComplete}
          />
        </div>
      </div>

      {/* Re-upload Modal */}
      <ReuploadModal
        isOpen={isReuploadModalOpen}
        onClose={() => setIsReuploadModalOpen(false)}
        feedbacks={iterationFeedbacks}
        onConfirm={handleReuploadConfirm}
      />
    </div>
  )
}
