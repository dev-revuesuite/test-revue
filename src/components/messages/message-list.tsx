"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getMessageInitials } from "@/lib/messages/utils"
import { cn } from "@/lib/utils"
import type { MessageItem } from "@/types/messages"

interface MessageListProps {
  messages: MessageItem[]
  loading?: boolean
  errorMessage?: string | null
  emptyMessage?: string
  onMessageClick?: (message: MessageItem) => void
  className?: string
  compact?: boolean
}

export function MessageList({
  messages,
  loading = false,
  errorMessage = null,
  emptyMessage = "No messages yet",
  onMessageClick,
  className,
  compact = false,
}: MessageListProps) {
  if (errorMessage) {
    return (
      <div className={cn("p-6 text-center text-sm text-red-500", className)}>
        {errorMessage}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn("p-6 text-center text-sm text-[#7a7a7a] dark:text-[#999]", className)}>
        Loading messages...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={cn("p-6 text-center text-sm text-[#7a7a7a] dark:text-[#999]", className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className}>
      {messages.map((message) => (
        <button
          key={message.id}
          type="button"
          onClick={() => onMessageClick?.(message)}
          className={cn(
            "w-full text-left p-3 border-b border-[#e6e6e6] dark:border-[#333] last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors",
            !message.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar className={cn(compact ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarFallback
                className={cn(
                  "bg-[#5C6ECD] text-white font-semibold",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {getMessageInitials(message.actorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">
                    {message.actorName}
                  </p>
                  <p className="text-xs text-[#1a1a1a] dark:text-white mt-0.5 line-clamp-1">
                    {message.title}
                  </p>
                </div>
                <span className="text-[10px] text-[#7a7a7a] dark:text-[#999] whitespace-nowrap shrink-0">
                  {message.time}
                </span>
              </div>
              <p className="text-xs text-[#7a7a7a] dark:text-[#999] mt-0.5 line-clamp-2">
                {message.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
