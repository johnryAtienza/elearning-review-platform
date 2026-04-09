import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Loader2, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CourseList } from '@/features/courses/components/CourseList'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useCourses } from '@/features/courses/hooks/useCourses'
import { cn } from '@/utils/cn'
import type { SortOption, DurationFilter } from '@/features/courses/types'

// ── Label maps ────────────────────────────────────────────────────────────────

const SORT_LABELS: Record<SortOption, string> = {
  'relevant':     'Most Relevant',
  'newest':       'Newest',
  'az':           'A → Z',
  'most-lessons': 'Most Lessons',
}

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: 'all',    label: 'Any duration' },
  { value: 'short',  label: 'Short (< 3h)' },
  { value: 'medium', label: 'Medium (3–6h)' },
  { value: 'long',   label: 'Long (6h+)' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function CoursesPage() {
  const isSubscribed = useAuthStore((s) => s.isSubscribed)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const filterBtnRef   = useRef<HTMLButtonElement>(null)

  const {
    courses, filtered, recommended,
    categories, loading, isSearching, error,
    search, setSearch, debouncedSearch,
    category, setCategory,
    duration, setDuration,
    sort, setSort,
    activeFilterCount, clearFilters,
  } = useCourses()

  // Close popup on outside click
  useEffect(() => {
    if (!filtersOpen) return
    function handleClick(e: MouseEvent) {
      if (
        filterPanelRef.current?.contains(e.target as Node) ||
        filterBtnRef.current?.contains(e.target as Node)
      ) return
      setFiltersOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filtersOpen])

  const hasQuery    = debouncedSearch.trim() !== ''
  const hasResults  = filtered.length > 0
  const showEmpty   = !loading && !isSearching && (hasQuery || activeFilterCount > 0) && !hasResults
  const showResults = !loading && !showEmpty
  const showRecommended = !hasQuery && activeFilterCount === 0 && !loading && courses.length > 0

  return (
    <div className="container mx-auto px-4 py-10 space-y-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading…'
              : hasQuery || activeFilterCount > 0
                ? `${filtered.length} of ${courses.length} courses`
                : `${courses.length} courses available`}
            {!isSubscribed && !isAdmin && ' — subscribe to unlock lessons'}
          </p>
        </div>
        {!isSubscribed && !isAdmin && (
          <Button asChild size="sm">
            <Link to="/subscription">Upgrade to Standard</Link>
          </Button>
        )}
      </div>

      {/* ── Search + Filter + Sort row ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
          )}
          {!isSearching && search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter button (toggles popup) */}
        <div className="relative shrink-0">
          <button
            ref={filterBtnRef}
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-2 h-9 rounded-md border px-3 text-sm shadow-xs',
              'bg-background text-foreground cursor-pointer transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
              filtersOpen && 'border-ring bg-muted',
            )}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('size-3.5 transition-transform', filtersOpen && 'rotate-180')} />
          </button>

          {/* ── Filter popup ── */}
          {filtersOpen && (
            <div
              ref={filterPanelRef}
              className={cn(
                'absolute left-0 top-full mt-2 z-50 min-w-72',
                'rounded-xl border bg-popover shadow-lg p-4 space-y-5',
              )}
            >
              {/* Category */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <FilterPill
                      key={cat}
                      active={cat === category}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Duration
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_OPTIONS.map((opt) => (
                    <FilterPill
                      key={opt.value}
                      active={opt.value === duration}
                      onClick={() => setDuration(opt.value)}
                    >
                      {opt.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Footer: clear */}
              {activeFilterCount > 0 && (
                <div className="pt-1 border-t">
                  <button
                    onClick={() => { clearFilters(); setFiltersOpen(false) }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                    Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort-select" className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
            Sort by
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className={cn(
              'h-9 rounded-md border bg-background px-3 text-sm shadow-xs',
              'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
              'text-foreground cursor-pointer',
            )}
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {error ? (
        <ErrorMessage message={error} />
      ) : showEmpty ? (
        <EmptyState query={debouncedSearch} recommended={recommended} />
      ) : showResults ? (
        <>
          {showRecommended ? (
            <RecommendedSection courses={recommended} loading={loading} />
          ) : (
            <CourseList courses={filtered} loading={loading || isSearching} />
          )}
        </>
      ) : (
        <CourseList courses={[]} loading={loading} />
      )}
    </div>
  )
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30',
      )}
    >
      {children}
    </button>
  )
}

// ── Recommended section ───────────────────────────────────────────────────────

import { CourseCard } from '@/features/courses/components/CourseCard'
import type { Course } from '@/features/courses/types'

function RecommendedSection({ courses, loading }: { courses: Course[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recommended for you
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <CourseList courses={courses} loading={loading} />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

import { BookOpen, SearchX } from 'lucide-react'

function EmptyState({ query, recommended }: { query: string; recommended: Course[] }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold text-base">No courses found</p>
          {query ? (
            <p className="text-sm text-muted-foreground max-w-xs">
              No results for <strong>"{query}"</strong>. Try different keywords or clear your filters.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters.
            </p>
          )}
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              You might also like
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
