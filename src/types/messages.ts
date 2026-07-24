export type MessageType = "feedback" | "reply"

export interface MessageRow {
  id: string
  created_at: string
  updated_at: string
  recipient_id: string
  organization_id: string
  actor_id: string | null
  type: MessageType | string
  title: string
  body: string | null
  link: string | null
  resource_type: string | null
  resource_id: string | null
  thread_key: string | null
  count: number
  read_at: string | null
  metadata: Record<string, unknown> | null
}

export interface MessageItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  link: string | null
  count: number
  type: string
  actorName: string
  createdAt: string
  updatedAt: string
}
