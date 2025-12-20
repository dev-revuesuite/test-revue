export default function CommunicationLoading() {
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
        <main className="flex-1 bg-background overflow-hidden">
          <div className="flex h-full">
            {/* Message List */}
            <div className="w-80 border-r border-border p-4 space-y-3">
              <div className="h-6 w-32 bg-muted animate-pulse mb-4" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse" />
                    <div className="h-3 w-32 bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            {/* Chat Area */}
            <div className="flex-1 p-6">
              <div className="h-full bg-muted/20 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
