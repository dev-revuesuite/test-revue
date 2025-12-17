"use client"

import { useState } from "react"
import { Reply } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Comment } from "@/types/revue-tool"

interface CommentThreadProps {
  comments: Comment[]
  onReplyToComment?: (comment: Comment) => void
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

export function CommentThread({ comments, onReplyToComment }: CommentThreadProps) {
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)

  if (comments.length === 0) return null

  const handleReply = (comment: Comment) => {
    onReplyToComment?.(comment)
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isCurrentUser = comment.user_name === "You"
        const isHovered = hoveredCommentId === comment.id

        // If current user's message, show on right
        if (isCurrentUser) {
          return (
            <div
              key={comment.id}
              className="flex justify-end group"
              onMouseEnter={() => setHoveredCommentId(comment.id)}
              onMouseLeave={() => setHoveredCommentId(null)}
            >
              <div className="flex items-center gap-2 max-w-[80%]">
                {/* Reply button on hover - left side for own messages */}
                <button
                  onClick={() => handleReply(comment)}
                  className={`p-1.5 rounded-full hover:bg-muted transition-all duration-200 ${
                    isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
                  title="Reply"
                >
                  <Reply className="size-4 text-muted-foreground" />
                </button>
                <div className="bg-muted rounded-sm px-4 py-2">
                  {/* Quoted text if exists */}
                  {comment.quoted_text && (
                    <div className="mb-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {comment.quoted_user || "You"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{comment.quoted_text}</p>
                    </div>
                  )}
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
          <div
            key={comment.id}
            className="flex items-start gap-2 group"
            onMouseEnter={() => setHoveredCommentId(comment.id)}
            onMouseLeave={() => setHoveredCommentId(null)}
          >
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

              {/* Message bubble with reply button */}
              <div className="flex items-center gap-2">
                <div className="bg-muted rounded-sm px-4 py-2 inline-block">
                  {/* Quoted text if exists */}
                  {comment.quoted_text && (
                    <div className="mb-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {comment.quoted_user || "You"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{comment.quoted_text}</p>
                    </div>
                  )}
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
                {/* Reply button on hover - right side for other's messages */}
                <button
                  onClick={() => handleReply(comment)}
                  className={`p-1.5 rounded-full hover:bg-muted transition-all duration-200 ${
                    isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
                  title="Reply"
                >
                  <Reply className="size-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
