export default function RevueToolLoading() {
  return (
    <div className="flex flex-col h-svh">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-border bg-background">
        <div className="h-5 w-24 bg-muted animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-muted animate-pulse" />
          <div className="h-8 w-8 bg-muted animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="flex flex-col h-full w-16 border-r border-border bg-background">
          <nav className="flex flex-col items-center gap-2 py-4 px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-12 h-12 bg-muted animate-pulse" />
            ))}
          </nav>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6 bg-background overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Title */}
            <div className="h-8 w-36 bg-muted animate-pulse" />

            {/* Tool Interface Skeleton */}
            <div className="border border-border">
              <div className="h-12 border-b border-border bg-muted/30 animate-pulse" />
              <div className="h-96 bg-muted/20 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
