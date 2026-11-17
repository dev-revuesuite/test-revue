import {
  AppHeaderLoadingSkeleton,
  AppSidebarSkeleton,
} from "@/components/studio/studio-loading-skeletons"

export default function RoomLoading() {
  return (
    <div className="flex flex-col h-svh">
      <AppHeaderLoadingSkeleton />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebarSkeleton />

        {/* Main Content Skeleton */}
        <main className="flex-1 bg-background overflow-hidden">
          <div className="flex h-full">
            {/* Room Content Area */}
            <div className="flex-1 p-6">
              <div className="h-full bg-muted/30 animate-pulse" />
            </div>
            {/* Right Panel */}
            <div className="w-80 border-l border-border p-4 space-y-4">
              <div className="h-6 w-24 bg-muted animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
