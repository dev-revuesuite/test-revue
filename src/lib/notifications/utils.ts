import type { NotificationItem, NotificationRow } from "@/types/notifications"

export function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : null
}

export function getNotificationDisplayTitle(row: NotificationRow): string {
  const metadata = row.metadata ?? {}

  if (row.count > 1) {
    if (row.type === "feedback") {
      const creativeName =
        getMetadataString(metadata, "creative_name") ?? "creative"
      return `${row.count} new comments on ${creativeName}`
    }
    if (row.type === "reply") {
      const creativeName =
        getMetadataString(metadata, "creative_name") ?? "creative"
      return `${row.count} new replies on ${creativeName}`
    }
    if (row.type === "ai_suggestions") {
      const creativeName =
        getMetadataString(metadata, "creative_name") ?? "creative"
      return `${row.count} AI suggestion updates on ${creativeName}`
    }
  }

  return row.title
}

export function mapNotificationRow(row: NotificationRow): NotificationItem {
  const timestamp = row.updated_at || row.created_at

  return {
    id: row.id,
    title: getNotificationDisplayTitle(row),
    description: row.body?.trim() || row.title,
    time: formatNotificationTime(timestamp),
    read: row.read_at !== null,
    link: row.link,
    count: row.count,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}
