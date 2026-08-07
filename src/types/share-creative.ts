export type ShareCandidateKind = "team" | "client"

export interface ShareCandidate {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  kind: ShareCandidateKind
  hasAccess: boolean
}

export interface ShareCreativeCandidatesResponse {
  sharePath: string
  creativeName: string
  projectName: string
  candidates: ShareCandidate[]
}

export interface ShareCreativeSendResponse {
  granted: number
  notified: number
}
