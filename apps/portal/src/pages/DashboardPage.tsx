import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Zap, Award, ChevronRight, Plus, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SavedSubjectCard } from '@/features/subjects/components/SavedSubjectCard'
import { MyBooksCard } from '@/features/books/components/MyBooksCard'
import { useAuthStore } from '@s-class/auth/authStore'
import { useSavedSubjectsStore } from '@s-class/auth/savedSubjectsStore'
import { useQuizHistoryStore } from '@s-class/auth/quizHistoryStore'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { AttemptRow } from './QuizHistoryPage'
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

  const firstName = user?.firstName || user?.name.split(' ')[0] || 'student'

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-10">

      {/* ── Student home hero ── */}
      <section className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground select-none">
              {initials}
            </span>
            <div className="min-w-0 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  My Learning
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Welcome back {firstName}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Pick up your saved subjects, review recent quiz results, and keep your study progress moving.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isSubscribed ? 'pro' : 'outline'}>
                  {isSubscribed ? 'Standard Plan' : 'Free Plan'}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Button asChild>
              <Link to={ROUTES.PORTAL_SUBJECTS}>
                <PlayCircle className="size-4 mr-1.5" />
                Continue learning
              </Link>
            </Button>
            {!isSubscribed && (
              <Button asChild variant="outline">
                <Link to={ROUTES.SUBSCRIPTION}>View plans</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats cards ── */}
      <section className="space-y-4">
        <SectionHeading title="Learning snapshot" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={BookOpen}
            label="Saved subjects"
            value={stats.subjectsSaved}
            loading={loading}
          />
          <StatCard
            icon={Zap}
            label="Lessons watched"
            value={stats.lessonsCompleted}
            loading={loading}
          />
          <StatCard
            icon={Award}
            label="Quizzes taken"
            value={stats.quizzesTaken}
            loading={loading}
          />
        </div>
      </section>

      {/* ── Subscription CTA ── */}
      {!isSubscribed && (
        <div className="rounded-2xl border bg-primary/5 border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold">Unlock full access</p>
            <p className="text-sm text-muted-foreground">
              Upgrade to Standard to open every lesson, reviewer, and quiz.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to={ROUTES.SUBSCRIPTION}>View plans</Link>
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
          <SectionHeading title="My subjects" count={savedSubjects.length} />
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to={ROUTES.PORTAL_SUBJECTS}>
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

function StatCard({
  icon: Icon, label, value, loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
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

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {count}
        </span>
      )}
      <div className="h-px flex-1 bg-border w-12" />
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
            Recent quiz results
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
              View all
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
          Browse the subject library and save the subjects you want to keep studying.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-1 gap-1.5">
        <Link to={ROUTES.PORTAL_SUBJECTS}>
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
