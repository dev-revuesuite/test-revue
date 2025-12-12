"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Comment } from "@/types/revue-tool"

interface CommentThreadProps {
  comments: Comment[]
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  return `${Math.floor(diffInSeconds / 86400)}d`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function CommentThread({ comments }: CommentThreadProps) {
  if (comments.length === 0) return null

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isCurrentUser = comment.user_name === "You"

        // If current user's message, show on right
        if (isCurrentUser) {
          return (
            <div key={comment.id} className="flex justify-end">
              <div className="flex items-end gap-2 max-w-[80%]">
                <div className="bg-muted rounded-sm px-4 py-2">
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(comment.created_at)}
                </span>
              </div>
            </div>
          )
        }

        // Other user's message, show on left with avatar
        return (
          <div key={comment.id} className="flex items-start gap-2">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={comment.user_avatar} alt={comment.user_name} />
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {getInitials(comment.user_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{comment.user_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(comment.created_at)}
                </span>
              </div>

              {/* Message bubble - sharp corners */}
              <div className="bg-muted rounded-sm px-4 py-2 inline-block">
                {/* Quoted text if exists */}
                {comment.quoted_text && (
                  <div className="mb-2 pb-2 border-b border-border">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {comment.quoted_user || "You"}
                      </span>
                      <span className="text-xs text-muted-foreground">2h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{comment.quoted_text}</p>
                  </div>
                )}
                <p className="text-sm text-foreground">{comment.content}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
