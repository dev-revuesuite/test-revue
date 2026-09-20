import type { MessageItem, MessageRow } from "@/types/messages"

import { formatRelativeTimeInZone } from "@/lib/timezone-preference"

export function formatMessageTime(dateStr: string, timeZone?: string): string {
  return formatRelativeTimeInZone(dateStr, timeZone ?? "UTC")
}

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : null
}

export function getMessageDisplayTitle(row: MessageRow): string {
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
  }

  return row.title
}

export function mapMessageRow(row: MessageRow, timeZone?: string): MessageItem {
  const timestamp = row.updated_at || row.created_at
  const metadata = row.metadata ?? {}

  return {
    id: row.id,
    title: getMessageDisplayTitle(row),
    description: row.body?.trim() || row.title,
    time: formatMessageTime(timestamp, timeZone),
    read: row.read_at !== null,
    link: row.link,
    count: row.count,
    type: row.type,
    actorName: getMetadataString(metadata, "actor_name") ?? "Someone",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function sortMessages(items: MessageItem[]): MessageItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function getMessageInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
