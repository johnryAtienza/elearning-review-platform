import { useState, useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Clock, BookOpen, Tag, ChevronLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LessonList } from '@/features/lessons/components/LessonList'
import { useAuthStore } from '@/store/authStore'
import { getCourseById } from '@/features/courses/services/courseService'
import { getLessonsByCourse } from '@/features/lessons/services/lessonService'
import { ROUTES } from '@/constants/routes'
import config from '@/config'
import type { Course } from '@/features/courses/types'
import type { Lesson } from '@/features/lessons/types'

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { isAuthenticated, isSubscribed } = useAuthStore()

  const [course, setCourse] = useState<Course | undefined>()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getCourseById(courseId), getLessonsByCourse(courseId)])
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

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── Left ── */}
        <div className="space-y-7 min-w-0">
          <div className={`rounded-2xl bg-linear-to-br ${course.thumbnail} h-56 sm:h-64 flex items-end p-6`}>
            <Badge variant="secondary" className="bg-black/25 text-white border-0 backdrop-blur-sm">
              {course.category}
            </Badge>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">{course.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" />
                {lessons.length} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {course.duration}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="size-4" />
                {course.category}
              </span>
            </div>
          </div>

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
                {lessons.length} lessons · {course.duration}
              </span>
            </h2>
            <div className="rounded-xl border overflow-hidden">
              <LessonList lessons={lessons} isSubscribed={isSubscribed} />
            </div>
          </div>
        </div>

        {/* ── Right: sticky enroll card ── */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className={`h-32 bg-linear-to-br ${course.thumbnail}`} />
            <div className="p-5 space-y-4">
              {isSubscribed ? (
                <>
                  <p className="font-semibold">Ready to start?</p>
                  <Button asChild className="w-full">
                    <Link to={ROUTES.LESSON(lessons[0]?.id ?? '')}>Start First Lesson</Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-4" />
                    <span>Lessons require a Pro subscription</span>
                  </div>
                  <Button asChild className="w-full">
                    <Link to={isAuthenticated ? ROUTES.SUBSCRIPTION : ROUTES.REGISTER}>
                      {isAuthenticated ? 'Upgrade to Pro' : 'Sign up Free'}
                    </Link>
                  </Button>
                  {isAuthenticated && (
                    <p className="text-xs text-center text-muted-foreground">
                      Starting at {config.subscription.proPricePerMonth}/month. Cancel anytime.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
            <h3 className="font-semibold">This course includes</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><BookOpen className="size-4" /> {lessons.length} on-demand lessons</li>
              <li className="flex items-center gap-2"><Clock className="size-4" /> {course.duration} total length</li>
              <li className="flex items-center gap-2"><span className="size-4 text-center text-xs">✓</span> Quiz after every lesson</li>
              <li className="flex items-center gap-2"><span className="size-4 text-center text-xs">✓</span> Reviewer notes included</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
