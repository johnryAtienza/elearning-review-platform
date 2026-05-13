import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Clock, BookOpen, Tag, ChevronLeft, Play, PlayCircle, FileText, ListChecks,
  Bookmark, BookmarkCheck, CalendarClock, PlusCircle, EyeOff, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
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
 * Phase A: until lessons gain `week_number` / `day_number` columns
 * (Phase B), we group client-side as `week = ceil(order / DAYS_PER_WEEK)`.
 * Default 6 days/week matches the client wireframe.
 */
const DAYS_PER_WEEK = 6

interface WeekGroup {
  weekNumber: number
  lessons: Lesson[]
}

function groupLessonsByWeek(lessons: Lesson[]): WeekGroup[] {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  const groups = new Map<number, Lesson[]>()
  for (const l of sorted) {
    const week = Math.max(1, Math.ceil(l.order / DAYS_PER_WEEK))
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load course.')
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
              {' '}— this course is not visible to students yet.
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

      {/* ── Course intro video ── */}
      <CourseIntroVideo course={course} />

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
            ) : isAuthenticated ? (
              <>
                <Button asChild>
                  <Link to={ROUTES.LESSON(firstLesson.id)}>
                    <Play className="size-4 mr-1.5" />
                    Start Free Preview
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Standard</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to={ROUTES.REGISTER}>Sign up to start</Link>
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
              <WeekBlock key={group.weekNumber} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Course intro video ───────────────────────────────────────────────────────
// 16:9 block at the top of the page. Reads the course thumbnail by default;
// a dedicated intro-video URL would be wired in here when admins can upload
// a per-course intro reel (out of Phase A scope).

function CourseIntroVideo({ course }: { course: Course }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="aspect-video relative">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            'w-full h-full flex items-center justify-center bg-linear-to-br',
            course.thumbnail || 'from-primary/30 to-card',
          )}>
            <PlayCircle className="size-16 text-foreground/40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/80 to-transparent p-4">
          <p className="text-xs text-muted-foreground italic">
            {course.title} intro — looping reel placeholder
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Week block ───────────────────────────────────────────────────────────────

function WeekBlock({ group }: { group: WeekGroup }) {
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
          <DayCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  )
}

// ── Day card ─────────────────────────────────────────────────────────────────
// Each card represents one day of the curriculum. The wireframe shows three
// content types per day (video / problem solutions / elements) — Phase A maps
// these labels to the existing lesson shape (video + reviewer PDF + quiz).
// The exact mapping is a Phase B decision; for now we display the labels as
// hints and keep the card linking to the existing LessonPage.

function DayCard({ lesson }: { lesson: Lesson }) {
  const isExam = /\bexam\b/i.test(lesson.title)
  return (
    <Link
      to={ROUTES.LESSON(lesson.id)}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors',
        'hover:border-primary/40 hover:bg-card/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          Day {lesson.order}
        </span>
        {isExam && <Badge variant="warning">Exam</Badge>}
      </div>

      <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {lesson.title}
      </h4>

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
