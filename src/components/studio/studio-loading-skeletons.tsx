import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function OrgSwitcherTriggerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-2 py-1.5", className)}>
      <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      <Skeleton className="h-4 w-[120px] max-w-[140px]" />
      <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
    </div>
  )
}

export function StudioStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 rounded-xl border border-black/10 dark:border-white/10 bg-card"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-2 min-w-0 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudioClientCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      <div className="space-y-2.5 mb-4 flex-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between py-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export function StudioClientGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <StudioClientCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function StudioDashboardSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <StudioStatsSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <StudioClientGridSkeleton />
      </div>
    </>
  )
}

export function OrgSwitchMainSkeleton() {
  return (
    <main className="flex-1 overflow-auto bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <StudioDashboardSkeleton />
      </div>
    </main>
  )
}

/** Neutral main-area placeholder for org switch on non-Studio pages. */
export function OrgSwitchGenericMainSkeleton() {
  return (
    <main className="flex-1 overflow-auto bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}

export function AppSidebarSkeleton() {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-[#e6e6e6] dark:border-[#333] bg-white dark:bg-[#1a1a1a]">
      <nav className="flex flex-col items-center gap-2 px-2 py-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-12 rounded-xl" />
        ))}
      </nav>
    </aside>
  )
}

export function AppHeaderLoadingSkeleton() {
  return (
    <header className="flex h-16 items-center border-b border-[#e6e6e6] bg-white px-5 dark:border-[#333] dark:bg-[#1a1a1a]">
      <div className="flex h-full items-center">
        <div className="relative -ml-5 flex h-full w-16 items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-[#e6e6e6] dark:bg-[#333]" />
        </div>
        <div className="ml-3 flex items-center">
          <OrgSwitcherTriggerSkeleton />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 pr-5">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </header>
  )
}

/** Studio-only full-page loading shell for route transitions and initial page load. */
export function AppPageLoadingShell() {
  return (
    <div className="flex h-svh flex-col">
      <AppHeaderLoadingSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebarSkeleton />
        <OrgSwitchMainSkeleton />
      </div>
    </div>
  )
}
