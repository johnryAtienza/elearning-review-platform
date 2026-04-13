import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Clock, BookOpen, Tag, ChevronLeft, Play, Film, FileText, HelpCircle, Bookmark, BookmarkCheck, CalendarClock, PlusCircle, EyeOff, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LessonList } from '@/features/lessons/components/LessonList'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { useAuthStore } from '@/store/authStore'
import { useSavedCoursesStore } from '@/store/savedCoursesStore'
import { getCourseById } from '@/features/courses/services/courseService'
import { courseApi } from '@/services/courseApi'
import { getLessonsByCourse } from '@/features/lessons/services/lessonService'
import { ROUTES } from '@/constants/routes'
import config from '@/config'
import type { Course } from '@/features/courses/types'
import type { Lesson } from '@/features/lessons/types'

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

  const totalDuration = useMemo(() => {
    const total = lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0)
    if (total === 0) return null
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }, [lessons])
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  }, [courseId])

  if (notFound) return <Navigate to="/" replace />
  if (error) return <ErrorMessage message={error} />

  if (loading || !course) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="size-4" />
        All Courses
      </Link>

      {/* ── Draft preview banner (admin only) ── */}
      {isAdmin && course.isPublished === false && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-4 py-3 mb-6">
          <div className="flex items-center gap-2.5 text-sm text-amber-800 dark:text-amber-300">
            <EyeOff className="size-4 shrink-0" />
            <span>
              <span className="font-semibold">Draft Preview</span>
              {' '}— this course is not visible to students yet.
            </span>
          </div>
          <Link
            to="/admin/courses"
            className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
          >
            Back to Admin
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── Left ── */}
        <div className="space-y-7 min-w-0">
          <CourseThumbnail
            src={course.thumbnailUrl}
            alt={course.title}
            gradient={course.thumbnail}
            className="rounded-2xl h-56 sm:h-64"
          >
            <div className="absolute inset-0 flex items-end p-6">
              <Badge variant="secondary" className="bg-black/25 text-white border-0 backdrop-blur-sm">
                {course.category}
              </Badge>
            </div>
          </CourseThumbnail>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">{course.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" />
                {lessons.length} lessons
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
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
              <div className="rounded-full bg-muted p-4">
                <CalendarClock className="size-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Lessons Coming Soon</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Content is being prepared for this course. Check back soon!
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
          ) : (
            <>
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h2 className="font-semibold">What you&apos;ll learn</h2>
                <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4">
                  {lessons.slice(0, 8).map((l) => (
                    <li key={l.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 text-primary shrink-0">✓</span>
                      {l.title}
                    </li>
                  ))}
                  {lessons.length > 8 && (
                    <li className="text-sm text-muted-foreground col-span-2">
                      + {lessons.length - 8} more lessons
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="font-semibold text-lg">
                  Course Content
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {lessons.length} lessons{totalDuration ? ` · ${totalDuration}` : ''}
                  </span>
                </h2>
                <div className="rounded-xl border overflow-hidden">
                  <LessonList lessons={lessons} isSubscribed={isSubscribed} isGuest={!isAuthenticated} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: sticky enroll card ── */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <CourseThumbnail
              src={course.thumbnailUrl}
              alt={course.title}
              gradient={course.thumbnail}
              className="h-32"
            />
            <div className="p-5 space-y-4">
              {/* Draft preview admin card */}
              {isAdmin && course.isPublished === false ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="size-4 text-amber-500 shrink-0" />
                    <p className="font-semibold text-sm">Draft — not published</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students cannot see this course until it is published.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/admin/courses">
                      <Pencil className="size-4 mr-1.5" />
                      Edit in Admin
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Tier badge */}
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{isSubscribed ? 'Ready to start?' : isAuthenticated ? 'Free access' : 'Get started'}</p>
                    {isAuthenticated && (
                      <span className={
                        isSubscribed
                          ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
                          : 'inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400'
                      }>
                        {isSubscribed ? 'Standard Plan' : 'Free Plan'}
                      </span>
                    )}
                  </div>

                  {/* Free plan access summary */}
                  {isAuthenticated && !isSubscribed && (
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Play className="size-3.5 text-amber-500 shrink-0" />
                        30-second video preview per lesson
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="size-3.5 text-amber-500 shrink-0" />
                        First 5 pages of reviewer PDFs
                      </li>
                      <li className="flex items-center gap-2 line-through opacity-50">
                        <HelpCircle className="size-3.5 shrink-0" />
                        Quizzes locked
                      </li>
                    </ul>
                  )}
                </>
              )}

              {isAdmin ? null : isSubscribed ? (
                <Button asChild className="w-full" disabled={lessons.length === 0}>
                  {lessons.length > 0
                    ? <Link to={ROUTES.LESSON(lessons[0].id)}>Start First Lesson</Link>
                    : <span>No lessons yet</span>
                  }
                </Button>
              ) : isAuthenticated ? (
                <>
                  <Button asChild className="w-full" disabled={lessons.length === 0}>
                    {lessons.length > 0
                      ? <Link to={ROUTES.LESSON(lessons[0].id)}>
                          <Play className="size-4 mr-1.5" />
                          Start Free Preview
                        </Link>
                      : <span>No lessons yet</span>
                    }
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={ROUTES.SUBSCRIPTION}>
                      Upgrade to Standard — {config.subscription.standardPricePerMonth}/mo
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link to={ROUTES.REGISTER}>Sign up Free</Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Free access with preview. Upgrade to unlock everything.
                  </p>
                </>
              )}

              {/* Save to dashboard — non-admin authenticated users only */}
              {isAuthenticated && !isAdmin && (
                <Button
                  variant={isSaved ? 'secondary' : 'outline'}
                  className="w-full gap-2"
                  onClick={handleToggleSave}
                  disabled={saving}
                >
                  {isSaved
                    ? <><BookmarkCheck className="size-4" /> Saved to Dashboard</>
                    : <><Bookmark className="size-4" /> Save to Dashboard</>
                  }
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
            <h3 className="font-semibold">This course includes</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><BookOpen className="size-4" /> {lessons.length} on-demand lessons</li>
              {totalDuration && (
                <li className="flex items-center gap-2"><Clock className="size-4" /> {totalDuration} total length</li>
              )}
              <li className="flex items-center gap-2"><Film className="size-4" /> Video lessons {isSubscribed ? '(full access)' : '(30s free preview)'}</li>
              <li className="flex items-center gap-2"><FileText className="size-4" /> Reviewer PDFs {isSubscribed ? '(full access)' : '(5 pages free)'}</li>
              <li className="flex items-center gap-2"><HelpCircle className="size-4" /> Quizzes {isSubscribed ? '(with scores & answers)' : '(Standard plan only)'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
