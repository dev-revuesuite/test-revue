export default function MasterDriveLoading() {
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
            {/* Title & Breadcrumb */}
            <div className="space-y-2">
              <div className="h-8 w-40 bg-muted animate-pulse" />
              <div className="h-4 w-64 bg-muted animate-pulse" />
            </div>

            {/* File/Folder Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4">
                  <div className="w-16 h-16 bg-muted animate-pulse" />
                  <div className="h-3 w-20 bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
