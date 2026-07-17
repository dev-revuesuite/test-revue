export type NotificationType =
  | "feedback"
  | "reply"
  | "iteration"
  | "brief_status"
  | "invite"
  | "member_added"
  | "org_member_joined"
  | "project_created"
  | "client_created"
  | "client_added_to_project"
  | "ai_suggestions"

export interface NotificationRow {
  id: string
  created_at: string
  updated_at: string
  recipient_id: string
  organization_id: string
  actor_id: string | null
  type: NotificationType | string
  title: string
  body: string | null
  link: string | null
  resource_type: string | null
  resource_id: string | null
  group_key: string | null
  count: number
  read_at: string | null
  metadata: Record<string, unknown> | null
}

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  link: string | null
  count: number
  type: string
  createdAt: string
  updatedAt: string
}
