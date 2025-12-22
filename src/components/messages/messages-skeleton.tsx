"use client"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export function MessagesSkeleton() {
  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Left Sidebar Skeleton */}
      <div className="w-60 min-w-60 border-r border-border flex flex-col bg-card">
        {/* New Chat Button */}
        <div className="p-3 border-b border-border">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden p-2 space-y-4">
          {/* Groups Section */}
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  {i < 2 && <Skeleton className="h-4 w-5 rounded-full" />}
                </div>
              ))}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <div className="space-y-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  {i < 2 && <Skeleton className="h-4 w-5 rounded-full" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center - Chat Area Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-md" />
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-6 overflow-hidden">
          {/* Welcome Banner */}
          <div className="pb-4 border-b border-border">
            <Skeleton className="h-12 w-12 rounded-xl mb-3" />
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Message Skeletons */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-full max-w-lg" />
                {i === 1 && <Skeleton className="h-4 w-3/4 max-w-md" />}
                {i === 2 && (
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-32 w-48 rounded-lg" />
                    <Skeleton className="h-32 w-48 rounded-lg" />
                  </div>
                )}
                {i === 0 && (
                  <div className="flex gap-1 mt-2">
                    <Skeleton className="h-6 w-12 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Composer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-1 p-2 border-b border-border/50">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-7 rounded" />
              ))}
            </div>
            <Skeleton className="h-16 m-3" />
          </div>
          <Skeleton className="h-3 w-48 mt-2" />
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className="w-72 min-w-72 border-l border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>

        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </div>

          {/* Members */}
          <div>
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Files */}
          <div>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-28 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
