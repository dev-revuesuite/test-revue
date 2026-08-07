import type { MediaType } from "@/lib/media-type"

export type CreativeUploadPhase =
  | "uploading"
  | "processing"
  | "done"
  | "failed"
  | "cancelled"

export type RoomCreativeType = "image" | "video" | "document" | "design"

export interface StartCreativeUploadInput {
  projectId: string
  projectName: string
  creativeName: string
  creativeType: RoomCreativeType
  file: File
}

export interface CreativeUploadJob {
  id: string
  projectId: string
  projectName: string
  creativeName: string
  creativeType: RoomCreativeType
  fileName: string
  fileSize: number
  phase: CreativeUploadPhase
  progress: number
  error?: string
  creativeId?: string
  startedAt: number
}

export interface CompletedCreativeUpload {
  projectId: string
  creative: {
    id: string
    name: string
    type: RoomCreativeType
    thumbnailUrl: string
    previewUrl?: string
    mediaType?: MediaType
    pageCount?: number | null
    updatedAt: string
    feedbackCount: number
    iteration: number
    status: "in_progress" | "completed"
  }
  briefStatus: string
}

export type CreativeUploadEvent =
  | { type: "progress"; jobId: string; progress: number; phase: CreativeUploadPhase }
  | { type: "complete"; job: CreativeUploadJob; result: CompletedCreativeUpload }
  | { type: "failed"; job: CreativeUploadJob }
  | { type: "cancelled"; jobId: string }

export type CreativeUploadListener = (event: CreativeUploadEvent) => void
