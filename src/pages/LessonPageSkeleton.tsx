import { Skeleton } from '@/components/ui/skeleton'

export function LessonPageSkeleton() {
  return (
    <div
      className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]"
      aria-busy="true"
      aria-label="Loading lesson"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">

        {/* Top bar */}
        <div className="sticky top-16 z-10 border-b bg-background/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
          <Skeleton className="h-4 w-24 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-48 hidden sm:block" />
            <Skeleton className="h-1.5 w-32 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-4 w-10" />
        </div>

        {/* Content */}
        <div className="px-4 py-8 max-w-3xl mx-auto space-y-8">
          {/* Title block */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Video player */}
          <Skeleton className="aspect-video w-full rounded-xl" />

          {/* CTA action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>

          {/* Tab panel placeholder */}
          <div className="rounded-xl border p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md ml-auto" />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l bg-card">
        <div className="sticky top-16 flex flex-col max-h-[calc(100vh-4rem)]">
          <div className="border-b px-4 py-3 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
