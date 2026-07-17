"use client"

import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/types/notifications"

interface NotificationListProps {
  notifications: NotificationItem[]
  loading?: boolean
  emptyMessage?: string
  onNotificationClick?: (notification: NotificationItem) => void
  className?: string
}

export function NotificationList({
  notifications,
  loading = false,
  emptyMessage = "No notifications yet",
  onNotificationClick,
  className,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className={cn("p-6 text-center text-sm text-[#7a7a7a] dark:text-[#999]", className)}>
        Loading notifications...
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("p-6 text-center text-sm text-[#7a7a7a] dark:text-[#999]", className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className}>
      {notifications.map((notif) => (
        <button
          key={notif.id}
          type="button"
          onClick={() => onNotificationClick?.(notif)}
          className={cn(
            "w-full text-left p-3 border-b border-[#e6e6e6] dark:border-[#333] last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors",
            !notif.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                !notif.read ? "bg-[#5C6ECD]" : "bg-transparent"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">
                  {notif.title}
                </p>
                <span className="text-[10px] text-[#7a7a7a] dark:text-[#999] whitespace-nowrap shrink-0">
                  {notif.time}
                </span>
              </div>
              <p className="text-xs text-[#7a7a7a] dark:text-[#999] mt-0.5 line-clamp-2">
                {notif.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
