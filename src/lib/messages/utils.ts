import type { MessageItem, MessageRow } from "@/types/messages"

export function formatMessageTime(dateStr: string): string {
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

export function mapMessageRow(row: MessageRow): MessageItem {
  const timestamp = row.updated_at || row.created_at
  const metadata = row.metadata ?? {}

  return {
    id: row.id,
    title: getMessageDisplayTitle(row),
    description: row.body?.trim() || row.title,
    time: formatMessageTime(timestamp),
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
