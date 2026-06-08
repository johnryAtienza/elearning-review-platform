import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Zap, Award, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SavedSubjectCard } from '@/features/subjects/components/SavedSubjectCard'
import { MyBooksCard } from '@/features/books/components/MyBooksCard'
import { useAuthStore } from '@/store/authStore'
import { useSavedSubjectsStore } from '@/store/savedCoursesStore'
import { useQuizHistoryStore } from '@/store/quizHistoryStore'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { AttemptRow } from '@/pages/QuizHistoryPage'
import { ROUTES } from '@/constants/routes'

export function DashboardPage() {
  const { user, isSubscribed } = useAuthStore()

  const { savedIds, progressMap, stats, loading, fetch } = useSavedSubjectsStore()
  const {
    attempts:      quizAttempts,
    loading:       quizLoading,
    initialized:   quizInitialized,
    fetch:         fetchQuizHistory,
  } = useQuizHistoryStore()
  const { subjects } = useSubjects()

  // Load saved subjects + stats + quiz history on mount
  useEffect(() => {
    fetch()
    fetchQuizHistory()
  }, [fetch, fetchQuizHistory])

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  // Merge saved IDs with full subject data
  const savedSubjects = useMemo(
    () =>
      savedIds
        .map((id) => subjects.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined),
    [savedIds, subjects],
  )

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* ── Profile card ── */}
      <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
          {initials}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <Badge variant={isSubscribed ? 'pro' : 'outline'}>
              {isSubscribed ? 'Standard' : 'Free'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Subjects Saved"
          value={stats.subjectsSaved}
          loading={loading}
          accent="blue"
        />
        <StatCard
          icon={Zap}
          label="Lessons Completed"
          value={stats.lessonsCompleted}
          loading={loading}
          accent="purple"
        />
        <StatCard
          icon={Award}
          label="Quizzes Taken"
          value={stats.quizzesTaken}
          loading={loading}
          accent="amber"
        />
      </div>

      {/* ── Subscription CTA ── */}
      {!isSubscribed && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold">Unlock full access</p>
            <p className="text-sm text-muted-foreground">
              Subscribe to Standard to access all lessons, quizzes, and reviewer content.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/subscription">View Plans</Link>
          </Button>
        </div>
      )}

      {/* ── Recent Quizzes ── */}
      <RecentQuizzesSection
        attempts={quizAttempts}
        loading={quizLoading && !quizInitialized}
      />

      {/* ── My Subjects ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              My Subjects
            </h2>
            {savedSubjects.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {savedSubjects.length}
              </span>
            )}
            <div className="h-px flex-1 bg-border w-12" />
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to="/courses">
              <Plus className="size-3.5" />
              Add subjects
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SavedSubjectCardSkeleton key={i} />
            ))}
          </div>
        ) : savedSubjects.length === 0 ? (
          <EmptySubjects />
        ) : (
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
        )}
      </section>

      {/* ── My books (only renders if user has any orders) ── */}
      <MyBooksCard />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

/*
 * Single-accent discipline: stat cards stay grayscale (muted/foreground).
 * One slot ('primary') is reserved for the most-actionable metric — pages
 * that want to spotlight a stat opt in by passing accent="primary".
 */
const ACCENT_CLASSES = {
  blue:    'bg-muted text-muted-foreground',
  purple:  'bg-muted text-muted-foreground',
  amber:   'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
}

function StatCard({
  icon: Icon, label, value, loading, accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  loading: boolean
  accent: keyof typeof ACCENT_CLASSES
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className={`flex size-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-7 w-12 mb-1" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Recent quizzes section ────────────────────────────────────────────────────

function RecentQuizzesSection({
  attempts,
  loading,
}: {
  attempts: ReturnType<typeof useQuizHistoryStore.getState>['attempts']
  loading:  boolean
}) {
  const preview = attempts.slice(0, 3)
  const hasMore = attempts.length > preview.length

  if (!loading && attempts.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Quizzes
          </h2>
          {attempts.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {attempts.length}
            </span>
          )}
          <div className="h-px flex-1 bg-border w-12" />
        </div>
        {hasMore && (
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to={ROUTES.QUIZ_HISTORY}>
              See all
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {preview.map((a) => (
            <AttemptRow key={a.id} attempt={a} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptySubjects() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <BookOpen className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold">No subjects saved yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Browse subjects and click the bookmark icon to add them here.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-1 gap-1.5">
        <Link to="/courses">
          <Plus className="size-3.5" />
          Browse subjects
        </Link>
      </Button>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SavedSubjectCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Skeleton className="h-40 rounded-none" />
      <div className="h-1.5 w-full bg-muted" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-4 pt-2 border-t">
          <Skeleton className="h-3 w-20 mt-2" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      </div>
    </div>
  )
}
