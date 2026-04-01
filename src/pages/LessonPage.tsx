import { useState, useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { VideoPlayer } from '@/features/lessons/components/VideoPlayer'
import { ReviewerSection } from '@/features/lessons/components/ReviewerSection'
import { QuizComponent } from '@/features/quiz/components/QuizComponent'
import { LessonList } from '@/features/lessons/components/LessonList'
import { useLesson } from '@/features/lessons/hooks/useLesson'
import { useSecureContent } from '@/features/lessons/hooks/useSecureContent'
import { useQuizStore } from '@/store/quizStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getReviewerContent } from '@/features/lessons/services/reviewerService'
import { getQuizByLessonId } from '@/features/quiz/services/quizService'
import type { ReviewerContent } from '@/features/lessons/types'
import type { Quiz } from '@/features/quiz/types'
import { cn } from '@/utils/cn'

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [videoEnded, setVideoEnded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reviewerContent, setReviewerContent] = useState<ReviewerContent | undefined>()
  const [quiz, setQuiz] = useState<Quiz | undefined>()

  const setLessonId = useQuizStore((s) => s.setLessonId)
  const submitted   = useQuizStore((s) => s.submitted)

  const isSubscribed = useAuthStore((s) => s.isSubscribed)

  const { data, loading, notFound, error } = useLesson(lessonId ?? '')

  // Fetch presigned R2 URLs — only fires when isSubscribed=true
  const {
    videoUrl: signedVideoUrl,
    pdfUrl:   signedPdfUrl,
    loading:  contentLoading,
    error:    contentError,
  } = useSecureContent(lessonId ?? '', isSubscribed)

  // Reset per-lesson state when the lesson changes
  useEffect(() => {
    if (!data?.lesson) return
    setLessonId(data.lesson.id)
    setVideoEnded(false)
    setReviewerContent(undefined)
    setQuiz(undefined)

    Promise.all([
      getReviewerContent(data.lesson.id),
      getQuizByLessonId(data.lesson.id),
    ]).then(([rc, qz]) => {
      setReviewerContent(rc)
      setQuiz(qz)
    })
  }, [data?.lesson.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) return <Navigate to="/" replace />
  if (error) return <ErrorMessage message={error} />

  if (loading || !data) {
    return (
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        <div className="flex-1 min-w-0 px-4 py-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const { lesson, course, siblings, prev, next, progress } = data
  const navReady = videoEnded && (quiz ? submitted : true)

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-16 z-10 border-b bg-background/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
          <Link
            to={ROUTES.COURSE(lesson.courseId)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">{course?.title ?? 'Course'}</span>
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate hidden sm:block">{lesson.title}</p>
            <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden max-w-xs">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <span className="text-xs text-muted-foreground shrink-0">
            {data.currentIdx + 1} / {siblings.length}
          </span>

          <button
            className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle lesson list"
          >
            <List className="size-5" />
          </button>
        </div>

        {/* Mobile lesson sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden border-b bg-card px-3 py-3 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 pb-2">
              {course?.title}
            </p>
            <LessonList lessons={siblings} isSubscribed activeLessonId={lesson.id} />
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-8 max-w-3xl mx-auto space-y-8">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Lesson {lesson.order} · {lesson.duration}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{lesson.description}</p>
          </div>

          {/* ── Subscription gate ── */}
          {!isSubscribed ? (
            <SubscriptionGate courseId={lesson.courseId} />
          ) : (
            <>
              {/* Signed-URL fetch error (non-blocking) */}
              {contentError && !contentError.isSubscriptionRequired && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Could not load secure content: {contentError.message}
                </div>
              )}

              {/* Video */}
              {contentLoading ? (
                <Skeleton className="aspect-video w-full rounded-xl" />
              ) : (
                <VideoPlayer
                  key={lesson.id}
                  title={lesson.title}
                  thumbnail={course?.thumbnail ?? 'from-gray-400 to-gray-500'}
                  src={signedVideoUrl ?? undefined}
                  durationSeconds={30}
                  onEnded={() => setVideoEnded(true)}
                />
              )}

              {/* Reviewer — show PDF viewer when available, structured text otherwise */}
              {(reviewerContent || signedPdfUrl) && (
                <ReviewerSection
                  content={reviewerContent}
                  pdfUrl={signedPdfUrl ?? undefined}
                  visible={videoEnded}
                />
              )}

              {quiz && (
                <QuizComponent questions={quiz.questions} visible={videoEnded} />
              )}

              {!navReady && (
                <p className="text-center text-xs text-muted-foreground">
                  {!videoEnded
                    ? 'Complete the video to unlock the reviewer and quiz.'
                    : 'Submit the quiz to unlock navigation.'}
                </p>
              )}

              <div className={cn(
                'flex items-center justify-between gap-4 pt-4 border-t transition-all duration-500',
                navReady ? 'opacity-100' : 'opacity-40 pointer-events-none',
              )}>
                {prev ? (
                  <Button asChild variant="outline" size="sm" className="max-w-[45%]">
                    <Link to={ROUTES.LESSON(prev.id)} className="flex items-center gap-1.5">
                      <ChevronLeft className="size-4 shrink-0" />
                      <span className="truncate">{prev.title}</span>
                    </Link>
                  </Button>
                ) : <div />}

                {next ? (
                  <Button asChild size="sm" className="max-w-[45%] ml-auto">
                    <Link to={ROUTES.LESSON(next.id)} className="flex items-center gap-1.5">
                      <span className="truncate">{next.title}</span>
                      <ChevronRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link to={ROUTES.COURSE(lesson.courseId)}>Back to Course</Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l bg-card">
        <div className="sticky top-16 flex flex-col max-h-[calc(100vh-4rem)]">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Course Content
            </p>
            <p className="text-sm font-medium mt-0.5 truncate">{course?.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{progress}%</span>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3">
            <LessonList lessons={siblings} isSubscribed activeLessonId={lesson.id} />
          </div>
        </div>
      </aside>
    </div>
  )
}

// ── Subscription gate ─────────────────────────────────────────────────────────

function SubscriptionGate({ courseId }: { courseId: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 px-6 py-12 text-center space-y-4">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Subscription Required</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Subscribe to unlock the video, reviewer PDF, and quizzes for all lessons.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button asChild>
          <Link to={ROUTES.SUBSCRIPTION}>Get full access</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={ROUTES.COURSE(courseId)}>Back to course</Link>
        </Button>
      </div>
    </div>
  )
}
