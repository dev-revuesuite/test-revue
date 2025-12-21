export default function BriefLoading() {
  return (
    <div className="flex flex-col h-svh bg-background">
      {/* Header Skeleton */}
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
        <div className="w-32 h-8 bg-muted rounded animate-pulse" />
        <div className="flex-1" />
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-r border-border bg-card p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
              <div>
                <div className="w-48 h-6 bg-muted rounded animate-pulse mb-2" />
                <div className="w-32 h-4 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="w-24 h-10 bg-muted rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-3 space-y-6">
              {/* Description */}
              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="w-24 h-4 bg-muted rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="w-full h-4 bg-muted rounded animate-pulse" />
                  <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-card">
                    <div className="w-16 h-3 bg-muted rounded animate-pulse mb-2" />
                    <div className="w-24 h-5 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Team Section */}
              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="w-20 h-4 bg-muted rounded animate-pulse mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="w-24 h-4 bg-muted rounded animate-pulse mb-1" />
                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Creatives */}
            <div className="lg:col-span-2">
              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-24 h-5 bg-muted rounded animate-pulse" />
                  <div className="w-28 h-9 bg-muted rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border border-border overflow-hidden">
                      <div className="aspect-video bg-muted animate-pulse" />
                      <div className="p-3">
                        <div className="w-20 h-4 bg-muted rounded animate-pulse mb-1" />
                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
