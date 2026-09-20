import type { NotificationItem, NotificationRow } from "@/types/notifications"

import { formatRelativeTimeInZone } from "@/lib/timezone-preference"

export function formatNotificationTime(dateStr: string, timeZone?: string): string {
  return formatRelativeTimeInZone(dateStr, timeZone ?? "UTC")
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

export function mapNotificationRow(
  row: NotificationRow,
  timeZone?: string
): NotificationItem {
  const timestamp = row.updated_at || row.created_at

  return {
    id: row.id,
    title: getNotificationDisplayTitle(row),
    description: row.body?.trim() || row.title,
    time: formatNotificationTime(timestamp, timeZone),
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
