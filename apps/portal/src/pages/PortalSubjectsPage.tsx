import { useEffect, useMemo } from 'react'
import { Search, X, Loader2, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/skeleton'
import { SubjectCard } from '@/features/subjects/components/SubjectCard'
import { SavedSubjectCard } from '@/features/subjects/components/SavedSubjectCard'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useSavedSubjectsStore } from '@s-class/auth/savedSubjectsStore'
import { ROUTES } from '@/constants/routes'

/**
 * Authenticated learning library. Two sections:
 *   1. My Subjects  — saved subjects with progress (SavedSubjectCard)
 *   2. All Subjects — full catalog (SubjectCard)
 *
 * Both card types are reused from /courses but routed into the portal
 * hub (/portal/subjects/:id) via their `to` override, so clicking a card
 * keeps the user inside the portal shell.
 *
 * Filtering is intentionally minimal vs. /courses (single search box).
 * The marketing-style course/duration/sort affordances stay on the
 * public subjects page where conversion-oriented browsing matters.
 */
export function PortalSubjectsPage() {
  const {
    subjects,
    filtered,
    loading,
    isSearching,
    error,
    search,
    setSearch,
    debouncedSearch,
  } = useSubjects()

  const { savedIds, progressMap, fetch: fetchSaved } = useSavedSubjectsStore()

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  const savedSubjects = useMemo(
    () =>
      savedIds
        .map((id) => subjects.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined),
    [savedIds, subjects],
  )

  // When searching, the filtered list applies to "All Subjects" too — but
  // the "My Subjects" section keeps its full set so users don't lose context
  // of what they've saved.
  const hasQuery = debouncedSearch.trim() !== ''

  if (loading && subjects.length === 0 && !error) {
    return <PortalSubjectsSkeleton />
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-10">

      {/* ── Header ── */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
        <p className="text-sm text-muted-foreground">
          {savedSubjects.length > 0
            ? `${savedSubjects.length} saved · ${subjects.length} available`
            : `${subjects.length} subjects available`}
        </p>
      </header>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search subjects…"
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

      {error && <ErrorMessage message={error} />}

      {/* ── My Subjects (only when not actively searching, to keep mental model clean) ── */}
      {!hasQuery && savedSubjects.length > 0 && (
        <section className="space-y-4">
          <SectionHeading title="My Subjects" count={savedSubjects.length} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedSubjects.map((subject) => {
              const progress = progressMap[subject.id]
              return (
                <SavedSubjectCard
                  key={subject.id}
                  subject={subject}
                  watchedLessons={progress?.watchedLessons ?? 0}
                  totalLessons={progress?.totalLessons ?? subject.lessons}
                  to={ROUTES.PORTAL_SUBJECT(subject.id)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* ── All Subjects ── */}
      <section className="space-y-4">
        <SectionHeading
          title={hasQuery ? 'Results' : 'All Subjects'}
          count={hasQuery ? filtered.length : subjects.length}
        />
        {hasQuery && filtered.length === 0 ? (
          <EmptyResults query={debouncedSearch} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(hasQuery ? filtered : subjects).map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                to={ROUTES.PORTAL_SUBJECT(subject.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {count}
        </span>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ── Empty results ────────────────────────────────────────────────────────────

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <BookOpen className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold">No subjects found</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          No results for <strong>"{query}"</strong>. Try different keywords.
        </p>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PortalSubjectsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
