// Types for the Revue Tool communications/feedback feature

export interface Brief {
  id: string
  title: string
  share_link: string
  original_image_url?: string // The original reference image for comparison
  created_at: string
}

export interface Iteration {
  id: string
  brief_id: string
  iteration_number: number
  image_url: string
  created_at: string
}

export interface CommentMarker {
  id: string
  iteration_id: string
  x_position: number // percentage 0-100
  y_position: number // percentage 0-100
  marker_number: number
}

export interface DrawingPath {
  points: { x: number; y: number }[]
  color: string
  size: number
}

export interface Feedback {
  id: string
  iteration_id: string
  feedback_number: string // e.g., "5.1", "5.2"
  content: string
  user_name: string
  user_role: "client" | "designer" | "admin"
  user_avatar?: string
  marker_x?: number
  marker_y?: number
  drawing_paths?: DrawingPath[] // For drawing-type feedbacks
  feedback_type: "comment" | "drawing"
  is_completed?: boolean // Mark feedback as addressed/completed
  created_at: string
  comments?: Comment[]
}

export interface Comment {
  id: string
  feedback_id: string
  parent_comment_id?: string
  content: string
  quoted_text?: string
  quoted_user?: string
  user_name: string
  user_avatar?: string
  created_at: string
  replies?: Comment[]
}

export interface Annotation {
  id: string
  iteration_id: string
  type: "freehand" | "rectangle" | "circle" | "arrow"
  data: AnnotationData
  color: string
  stroke_width: number
  created_at: string
}

export interface AnnotationData {
  points?: { x: number; y: number }[]
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
}

export type ActiveTool = "select" | "draw" | "comment"

export interface ImageViewerState {
  zoom: number
  panX: number
  panY: number
  isFullscreen: boolean
  activeTool: ActiveTool
  brushColor: string
  brushSize: number
}

export interface RevueToolState {
  brief: Brief | null
  iterations: Iteration[]
  activeIterationId: string | null
  feedbacks: Feedback[]
  highlightedFeedbackId: string | null
  viewerState: ImageViewerState
}
