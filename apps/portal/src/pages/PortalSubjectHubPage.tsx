import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Clock, BookOpen, Tag, ChevronLeft, Play, Bookmark, BookmarkCheck,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SubjectThumbnail } from '@/components/SubjectThumbnail'
import { useAuthStore } from '@s-class/auth/authStore'
import { useSavedSubjectsStore } from '@s-class/auth/savedSubjectsStore'
import { subjectApi } from '@s-class/api/subjectApi'
import { lessonApi } from '@s-class/api/lessonApi'
import { groupLessonsByWeek, WeekBlock } from '@/features/subjects/components/curriculum'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import type { Subject } from '@/features/subjects/types'
import type { Lesson } from '@/features/lessons/types'

/**
 * Authenticated subject hub. Companion to the public SubjectDetailPage
 * (/portal/subjects/:subjectId), with student progress and curriculum actions.
 *
 * Reuses:
 *   - subjectApi.getById, lessonApi.getBySubject (existing provider routers)
 *   - useSavedSubjectsStore (existing store, read-only for progress)
 *   - WeekBlock + groupLessonsByWeek (extracted curriculum primitives,
 *     same code path SubjectDetailPage uses)
 *
 * No new business logic, no new data fetching, no progress-tracking writes.
 */

// Hoisted selectors — stable references; see RootLayout.tsx for rationale.
const selectIsAuthenticated = (s: { isAuthenticated: boolean }) => s.isAuthenticated
const selectIsSubscribed    = (s: { isSubscribed: boolean })    => s.isSubscribed

export function PortalSubjectHubPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isSubscribed    = useAuthStore(selectIsSubscribed)
  const isSaved = useSavedSubjectsStore((s) => subjectId ? s.isSaved(subjectId) : false)
  const toggle  = useSavedSubjectsStore((s) => s.toggle)
  const progress = useSavedSubjectsStore(
    (s) => subjectId ? s.progressMap[subjectId] : undefined,
  )
  const [saving, setSaving] = useState(false)

  async function handleToggleSave() {
    if (!subjectId || saving) return
    setSaving(true)
    try { await toggle(subjectId) } finally { setSaving(false) }
  }

  const [subject, setSubject] = useState<Subject | undefined>()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const totalDuration = useMemo(() => {
    const total = lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0)
    if (total === 0) return null
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }, [lessons])

  const weekGroups = useMemo(() => groupLessonsByWeek(lessons), [lessons])

  useEffect(() => {
    if (!subjectId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([subjectApi.getById(subjectId), lessonApi.getBySubject(subjectId)])
      .then(([s, ls]) => {
        if (cancelled) return
        if (!s) { setNotFound(true) } else { setSubject(s); setLessons(ls) }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load subject.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [subjectId])

  if (notFound) return <Navigate to={ROUTES.PORTAL_SUBJECTS} replace />
  if (error)    return <ErrorMessage message={error} />

  if (loading || !subject) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const firstLesson           = lessons[0]
  const firstLessonIsPreview  = firstLesson?.isFreePreview === true
  const watched               = progress?.watchedLessons ?? 0
  const totalForProgress      = progress?.totalLessons ?? lessons.length
  const progressPct           = totalForProgress > 0
    ? Math.round((watched / totalForProgress) * 100)
    : 0
  const hasProgress           = isSaved && totalForProgress > 0
  const completed             = hasProgress && progressPct === 100

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">

      {/* ── Back link ── */}
      <Link
        to={ROUTES.PORTAL_SUBJECTS}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        All subjects
      </Link>

      {/* ── Subject banner ── */}
      <SubjectThumbnail
        src={subject.thumbnailUrl}
        alt={subject.title}
        gradient={subject.thumbnail}
        className="aspect-video w-full rounded-2xl border"
      />

      {/* ── Title + meta ── */}
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {subject.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            {subject.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          </span>
          {totalDuration && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {totalDuration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Tag className="size-4" />
            {subject.category}
          </span>
          <span className={
            isSubscribed
              ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
              : 'inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning'
          }>
            {isSubscribed ? 'Standard Plan' : 'Free Plan'}
          </span>
        </div>
      </header>

      {/* ── Progress card ── */}
      {hasProgress && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your progress
              </p>
              <p className="text-sm mt-1">
                <span className="font-semibold tabular-nums">
                  {watched} / {totalForProgress}
                </span>{' '}
                lessons watched
              </p>
            </div>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              completed ? 'text-success' : 'text-primary',
            )}>
              {progressPct}%
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completed ? 'bg-success' : 'bg-primary',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex flex-wrap items-center gap-3">
        {firstLesson && (
          isSubscribed ? (
            <Button asChild>
              <Link to={ROUTES.LESSON(firstLesson.id)}>
                <Play className="size-4 mr-1.5" />
                {hasProgress && watched > 0 ? 'Continue Learning' : 'Start First Lesson'}
              </Link>
            </Button>
          ) : firstLessonIsPreview ? (
            <>
              <Button asChild>
                <Link to={ROUTES.LESSON(firstLesson.id)}>
                  <Play className="size-4 mr-1.5" />
                  Watch Free Preview
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={ROUTES.SUBSCRIPTION}>Enroll Now</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to={ROUTES.SUBSCRIPTION}>Enroll Now</Link>
            </Button>
          )
        )}

        <Button
          variant={isSaved ? 'secondary' : 'outline'}
          onClick={handleToggleSave}
          disabled={saving}
        >
          {isSaved
            ? <><BookmarkCheck className="size-4 mr-1.5" /> Saved</>
            : <><Bookmark className="size-4 mr-1.5" /> Save to My Learning</>
          }
        </Button>
      </div>

      {/* ── Curriculum ── */}
      {lessons.length === 0 ? (
        <EmptyCurriculum />
      ) : (
        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Curriculum
          </h2>
          <div className="space-y-8">
            {weekGroups.map((group) => (
              <WeekBlock
                key={group.weekNumber}
                group={group}
                isSubscribed={isSubscribed}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Empty curriculum ─────────────────────────────────────────────────────────

function EmptyCurriculum() {
  return (
    <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-muted p-4">
        <CalendarClock className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Curriculum coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Lesson content is being prepared for this subject.
        </p>
      </div>
    </div>
  )
}
