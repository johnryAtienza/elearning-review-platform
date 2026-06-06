import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Clock, BookOpen, Tag, ChevronLeft, Play, PlayCircle, FileText, ListChecks,
  Bookmark, BookmarkCheck, CalendarClock, PlusCircle, EyeOff, Pencil, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { useAuthStore } from '@/store/authStore'
import { useSavedCoursesStore } from '@/store/savedCoursesStore'
import { getCourseById } from '@/features/courses/services/courseService'
import { courseApi } from '@/services/courseApi'
import { getLessonsByCourse } from '@/features/lessons/services/lessonService'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import type { Course } from '@/features/courses/types'
import type { Lesson } from '@/features/lessons/types'

/**
 * Curriculum grid grouping.
 *
 * Prefers `lesson.weekNumber` (set after the add_lesson_week_day migration
 * runs). Falls back to `ceil(order / DAYS_PER_WEEK)` for any lesson row
 * that hasn't been backfilled yet so the page still renders correctly.
 *
 * `DAYS_PER_WEEK = 6` matches the client wireframe (Day 6 = Week 1 Exam,
 * Day 12 = Week 2 Exam, etc.).
 */
const DAYS_PER_WEEK = 6

interface WeekGroup {
  weekNumber: number
  lessons: Lesson[]
}

function effectiveWeek(lesson: Lesson): number {
  return lesson.weekNumber ?? Math.max(1, Math.ceil(lesson.order / DAYS_PER_WEEK))
}

function effectiveDay(lesson: Lesson): number {
  return lesson.dayNumber ?? lesson.order
}

function groupLessonsByWeek(lessons: Lesson[]): WeekGroup[] {
  const sorted = [...lessons].sort((a, b) => effectiveDay(a) - effectiveDay(b))
  const groups = new Map<number, Lesson[]>()
  for (const l of sorted) {
    const week = effectiveWeek(l)
    const arr = groups.get(week) ?? []
    arr.push(l)
    groups.set(week, arr)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, lessons]) => ({ weekNumber, lessons }))
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { isAuthenticated, isSubscribed, isAdmin } = useAuthStore()
  const isSaved = useSavedCoursesStore((s) => courseId ? s.isSaved(courseId) : false)
  const toggle  = useSavedCoursesStore((s) => s.toggle)
  const [saving, setSaving] = useState(false)

  async function handleToggleSave() {
    if (!courseId || saving) return
    setSaving(true)
    try { await toggle(courseId) } finally { setSaving(false) }
  }

  const [course, setCourse] = useState<Course | undefined>()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchCourse = isAdmin ? courseApi.getByIdAdmin(courseId) : getCourseById(courseId)
    Promise.all([fetchCourse, getLessonsByCourse(courseId)])
      .then(([c, ls]) => {
        if (cancelled) return
        if (!c) { setNotFound(true) } else { setCourse(c); setLessons(ls) }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load subject.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [courseId, isAdmin])

  if (notFound) return <Navigate to="/" replace />
  if (error) return <ErrorMessage message={error} />

  if (loading || !course) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const firstLesson = lessons[0]
  // Preview CTA is offered when the first lesson is flagged is_free_preview.
  // The flag is server-authoritative, so this stays accurate as marketing
  // changes which lessons are free without a code deploy.
  const firstLessonIsPreview = firstLesson?.isFreePreview === true

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Home
      </Link>

      {/* ── Draft preview banner (admin only) ── */}
      {isAdmin && course.isPublished === false && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-warning">
            <EyeOff className="size-4 shrink-0" />
            <span>
              <span className="font-semibold">Draft Preview</span>
              {' '}— this subject is not visible to students yet.
            </span>
          </div>
          <Link
            to="/admin/courses"
            className="shrink-0 text-xs font-medium text-warning hover:underline inline-flex items-center gap-1"
          >
            <Pencil className="size-3" />
            Edit
          </Link>
        </div>
      )}

      {/* ── Course banner ── */}
      <CourseBanner course={course} />

      {/* ── Title + meta + actions ── */}
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            {course.description}
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
            {course.category}
          </span>
          {isAuthenticated && (
            <span className={
              isSubscribed
                ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
                : 'inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning'
            }>
              {isSubscribed ? 'Standard Plan' : 'Free Plan'}
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {!isAdmin && firstLesson && (
            isSubscribed ? (
              <Button asChild>
                <Link to={ROUTES.LESSON(firstLesson.id)}>
                  <Play className="size-4 mr-1.5" />
                  Start First Lesson
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
                  <Link to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}>
                    Enroll Now
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}>
                  Enroll Now
                </Link>
              </Button>
            )
          )}

          {isAuthenticated && !isAdmin && (
            <Button
              variant={isSaved ? 'secondary' : 'outline'}
              onClick={handleToggleSave}
              disabled={saving}
            >
              {isSaved
                ? <><BookmarkCheck className="size-4 mr-1.5" /> Saved</>
                : <><Bookmark className="size-4 mr-1.5" /> Save to Dashboard</>
              }
            </Button>
          )}
        </div>
      </header>

      {/* ── Curriculum (week × day grid) ── */}
      {lessons.length === 0 ? (
        <EmptyCurriculum isAdmin={isAdmin} />
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

// ── Course banner ────────────────────────────────────────────────────────────
// 16:9 hero image at the top of the page. Uses the shared CourseThumbnail
// component (same one CourseCard uses) so banner + card look consistent.

function CourseBanner({ course }: { course: Course }) {
  return (
    <CourseThumbnail
      src={course.thumbnailUrl}
      alt={course.title}
      gradient={course.thumbnail}
      className="aspect-video w-full rounded-2xl border"
    />
  )
}

// ── Week block ───────────────────────────────────────────────────────────────

interface WeekBlockProps {
  group: WeekGroup
  isSubscribed: boolean
  isAuthenticated: boolean
}

function WeekBlock({ group, isSubscribed, isAuthenticated }: WeekBlockProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold tracking-wider uppercase text-foreground flex items-center gap-3">
        Week {group.weekNumber}
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {group.lessons.length} {group.lessons.length === 1 ? 'day' : 'days'}
        </span>
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {group.lessons.map((lesson) => (
          <DayCard
            key={lesson.id}
            lesson={lesson}
            isSubscribed={isSubscribed}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    </div>
  )
}

// ── Day card ─────────────────────────────────────────────────────────────────
// One card per curriculum day. The wireframe shows three content types per
// day (video / problem solutions / elements) — Phase A wired these as visual
// hints; the exact backing data is still the existing LessonPage.
//
// Click rules (Phase B):
//   - Subscribers       → navigate to the lesson.
//   - Anyone, Day 1     → navigate to the lesson (free for everyone).
//   - Free user, Day 2+ → render as a non-interactive locked card with a
//                          link out to /subscription on the action affordance.
//   - Guests            → can browse but click follows the same rules; the
//                          /lesson/:id route guard sends them to /login.

interface DayCardProps {
  lesson: Lesson
  isSubscribed: boolean
  isAuthenticated: boolean
}

function DayCard({ lesson, isSubscribed, isAuthenticated }: DayCardProps) {
  const isExam    = /\bexam\b/i.test(lesson.title)
  const day       = effectiveDay(lesson)
  const isPreview = lesson.isFreePreview === true
  // Free-preview lessons unlock for everyone — guests, free-tier auth, and
  // subscribers alike. Premium lessons require a subscription.
  const unlocked  = isSubscribed || isPreview

  const cardBase = 'group flex flex-col gap-2 rounded-xl border p-4 transition-colors'
  const sharedFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  const header = (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        Day {day}
      </span>
      {isExam
        ? <Badge variant="warning">Exam</Badge>
        : isPreview && !isSubscribed
          ? <Badge variant="success">Free Preview</Badge>
          : !unlocked
            ? <Lock className="size-3.5 text-muted-foreground" aria-label="Enroll to unlock" />
            : null
      }
    </div>
  )

  const title = (
    <h4 className={cn(
      'text-sm font-semibold leading-snug line-clamp-2 transition-colors',
      unlocked && 'group-hover:text-primary',
    )}>
      {lesson.title}
    </h4>
  )

  const contentTypes = (
    <ul className="mt-auto space-y-0.5 pt-2">
      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <PlayCircle className="size-3 shrink-0" />
        Video explainer
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText className="size-3 shrink-0" />
        Problem solutions
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ListChecks className="size-3 shrink-0" />
        Elements
      </li>
    </ul>
  )

  // Unlocked → real link to the lesson.
  if (unlocked) {
    return (
      <Link
        to={ROUTES.LESSON(lesson.id)}
        className={cn(
          cardBase, sharedFocus,
          'bg-card hover:border-primary/40 hover:bg-card/80',
        )}
      >
        {header}
        {title}
        {contentTypes}
      </Link>
    )
  }

  // Locked (free user, Day 2+) → show curriculum but route to the upgrade page.
  // Guests get the same card; the /subscription route is public.
  return (
    <Link
      to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}
      className={cn(
        cardBase, sharedFocus,
        'bg-card/60 border-dashed cursor-pointer',
        'hover:border-primary/40 hover:bg-card',
      )}
      aria-label={`${lesson.title} — Enroll to unlock`}
    >
      {header}
      {title}
      {contentTypes}
      <p className="text-[11px] font-semibold text-primary mt-1">
        Enroll Now to unlock →
      </p>
    </Link>
  )
}

// ── Empty curriculum ─────────────────────────────────────────────────────────

function EmptyCurriculum({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-muted p-4">
        <CalendarClock className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Curriculum coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Lesson content is being prepared for this course.
        </p>
      </div>
      {isAdmin && (
        <Link
          to="/admin/lessons"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1"
        >
          <PlusCircle className="size-4" />
          Add lessons in Admin
        </Link>
      )}
    </div>
  )
}
