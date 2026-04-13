import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage, FormAlert } from '@/components/ui/ErrorMessage'
import { VideoPlayer } from '@/features/lessons/components/VideoPlayer'
import { ReviewerSection } from '@/features/lessons/components/ReviewerSection'
import { QuizComponent } from '@/features/quiz/components/QuizComponent'
import { LessonList } from '@/features/lessons/components/LessonList'
import { LessonCTAs } from '@/features/lessons/components/LessonCTAs'
import { ContentWatermark } from '@/components/ContentWatermark'
import { useLesson } from '@/features/lessons/hooks/useLesson'
import { useSecureContent } from '@/features/lessons/hooks/useSecureContent'
import { useContentProtection } from '@/hooks/useContentProtection'
import { useScreenRecordingDetection } from '@/hooks/useScreenRecordingDetection'
import { useQuizStore } from '@/store/quizStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getReviewerContent } from '@/features/lessons/services/reviewerService'
import { getQuizByLessonId } from '@/features/quiz/services/quizService'
import { getPermissions, tierFromSubscribed, isUnlimited } from '@/features/subscription/services/accessControl'
import { getLessonWatchedStatus, markLessonWatched } from '@/services/lessonProgressApi'
import type { ReviewerContent } from '@/features/lessons/types'
import type { Quiz } from '@/features/quiz/types'
import { cn } from '@/utils/cn'
import config from '@/config'

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>()

  // ── Per-lesson UI state ──────────────────────────────────────────────────
  const [videoProgress,   setVideoProgress]   = useState(0)
  const [previewEnded,    setPreviewEnded]     = useState(false)
  const [sidebarOpen,     setSidebarOpen]      = useState(false)
  const [reviewerContent, setReviewerContent] = useState<ReviewerContent | undefined>()
  const [quiz,            setQuiz]            = useState<Quiz | undefined>()

  // Watched state — loaded from backend, persisted on user action
  const [isWatched,      setIsWatched]      = useState(false)
  const [markingWatched, setMarkingWatched] = useState(false)

  // Refs for scroll-to behaviour from LessonCTAs
  const reviewerRef = useRef<HTMLDivElement>(null)
  const quizRef     = useRef<HTMLDivElement>(null)

  const setLessonId = useQuizStore((s) => s.setLessonId)
  const submitted   = useQuizStore((s) => s.submitted)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSubscribed    = useAuthStore((s) => s.isSubscribed)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const user            = useAuthStore((s) => s.user)

  // ── Content protection (subscribed non-admin users only) ─────────────────
  const protectionActive = config.protection.enabled && isSubscribed && !isAdmin

  useContentProtection(protectionActive && config.protection.blockDevTools)

  const handleSuspiciousCapture = useCallback((_count: number) => {
    // Extend here: POST to an analytics endpoint to log capture attempts
  }, [])

  useScreenRecordingDetection(
    protectionActive && config.protection.detectCapture,
    handleSuspiciousCapture,
  )

  // Derive tier + permissions from subscription status
  const tier        = tierFromSubscribed(isSubscribed)
  const permissions = getPermissions(tier)

  const { data, loading, notFound, error } = useLesson(lessonId ?? '')

  // Fetch presigned R2 URLs for all authenticated users
  const {
    videoUrl:    signedVideoUrl,
    pdfUrl:      signedPdfUrl,
    loading:     contentLoading,
    error:       contentError,
  } = useSecureContent(lessonId ?? '', isAuthenticated)

  // Reset per-lesson state and reload backend progress when lesson changes
  useEffect(() => {
    if (!data?.lesson) return

    setLessonId(data.lesson.id)
    setVideoProgress(0)
    setPreviewEnded(false)
    setIsWatched(false)
    setMarkingWatched(false)
    setReviewerContent(undefined)
    setQuiz(undefined)

    const lessonId = data.lesson.id

    Promise.all([
      getReviewerContent(lessonId),
      getQuizByLessonId(lessonId),
      // Load persisted watch status for authenticated users
      isAuthenticated ? getLessonWatchedStatus(lessonId) : Promise.resolve(false),
    ]).then(([rc, qz, watched]) => {
      setReviewerContent(rc)
      setQuiz(qz)
      setIsWatched(watched)
    })
  }, [data?.lesson.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark as Watched handler ──────────────────────────────────────────────
  async function handleMarkWatched() {
    if (!data?.lesson || isWatched || markingWatched) return
    setMarkingWatched(true)
    try {
      if (isAuthenticated) {
        await markLessonWatched(data.lesson.id)
      }
      setIsWatched(true)
    } catch (err) {
      console.error('Failed to save watch progress:', err)
      // Still unlock locally even if backend save fails
      setIsWatched(true)
    } finally {
      setMarkingWatched(false)
    }
  }

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

  // Subscribed: PDF + quiz unlock after marking watched; Free: always visible (limited/locked)
  const contentUnlocked = isSubscribed ? isWatched : true

  // Navigation: subscribed needs isWatched + quiz submitted; free needs preview done
  const navReady = isSubscribed
    ? isWatched && (quiz ? submitted : true)
    : previewEnded

  // Video preview seconds — undefined when unlimited (standard tier)
  const videoPreviewSec = isUnlimited(permissions.videoPreviewSeconds)
    ? undefined
    : permissions.videoPreviewSeconds

  // Single completion hint shown below the quiz section
  const completionHint = getCompletionHint({
    isSubscribed, isWatched, videoProgress, quiz, submitted, previewEnded,
    previewSeconds: permissions.videoPreviewSeconds,
  })

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

          <div className="flex items-center gap-2 shrink-0">
            {/* Tier badge */}
            <span className={cn(
              'hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              isSubscribed
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}>
              {isSubscribed ? 'Standard' : 'Free'}
            </span>

            <span className="text-xs text-muted-foreground">
              {data.currentIdx + 1} / {siblings.length}
            </span>
          </div>

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

          {/* Content error (non-blocking) */}
          {contentError && !contentError.isSubscriptionRequired && (
            <FormAlert>Could not load secure content: {contentError.message}</FormAlert>
          )}

          {/* ── Video ── */}
          {contentLoading ? (
            <Skeleton className="aspect-video w-full rounded-xl" />
          ) : (
            <div
              className="relative"
              onContextMenu={(e) => protectionActive && e.preventDefault()}
            >
              <VideoPlayer
                key={lesson.id}
                title={lesson.title}
                thumbnail={course?.thumbnail ?? 'from-gray-400 to-gray-500'}
                src={signedVideoUrl ?? undefined}
                durationSeconds={30}
                onEnded={() => setVideoProgress(100)}
                previewDuration={videoPreviewSec}
                onPreviewEnded={() => setPreviewEnded(true)}
                onProgress={setVideoProgress}
              />
              <ContentWatermark
                label={user?.email ?? user?.id ?? ''}
                enabled={protectionActive && config.protection.watermark}
              />
            </div>
          )}

          {/* ── CTA action bar ── */}
          <LessonCTAs
            videoProgress={videoProgress}
            isWatched={isWatched}
            markingWatched={markingWatched}
            onMarkWatched={handleMarkWatched}
            hasReviewer={!!(reviewerContent || signedPdfUrl)}
            onViewReviewer={() => scrollTo(reviewerRef)}
            hasQuiz={!!quiz}
            onTakeQuiz={() => scrollTo(quizRef)}
          />

          {/* ── Free tier banner ── */}
          {!isSubscribed && (
            <FreeTierBanner previewEnded={previewEnded} previewSeconds={permissions.videoPreviewSeconds} />
          )}

          {/* ── Reviewer ── */}
          {(reviewerContent || signedPdfUrl) && (
            <div ref={reviewerRef}>
              <ReviewerSection
                content={reviewerContent}
                pdfUrl={signedPdfUrl ?? undefined}
                visible={contentUnlocked}
                tier={tier}
              />
            </div>
          )}

          {/* ── Quiz ── */}
          {quiz && (
            <div ref={quizRef}>
              <QuizComponent
                questions={quiz.questions}
                visible={contentUnlocked}
                locked={!permissions.quizEnabled}
              />
            </div>
          )}

          {/* Completion hint */}
          {completionHint && (
            <p className="text-center text-xs text-muted-foreground">{completionHint}</p>
          )}

          {/* ── Navigation ── */}
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

// ── Completion hint ───────────────────────────────────────────────────────────

function getCompletionHint({
  isSubscribed, isWatched, videoProgress, quiz, submitted, previewEnded, previewSeconds,
}: {
  isSubscribed: boolean
  isWatched: boolean
  videoProgress: number
  quiz: Quiz | undefined
  submitted: boolean
  previewEnded: boolean
  previewSeconds: number
}): ReactNode {
  if (isSubscribed) {
    if (!isWatched && videoProgress < 95)
      return <>Watch at least 95% of the video, then click <strong>Mark as Watched</strong> to unlock the reviewer and quiz.</>
    if (!isWatched)
      return <>Click <strong>Mark as Watched</strong> to unlock the reviewer and quiz.</>
    if (quiz && !submitted)
      return 'Submit the quiz to unlock navigation.'
    return null
  }
  return !previewEnded ? `Watch the ${previewSeconds}s preview to continue.` : null
}

// ── Free tier informational banner ────────────────────────────────────────────

interface FreeTierBannerProps {
  previewEnded: boolean
  previewSeconds: number
}

function FreeTierBanner({ previewEnded, previewSeconds }: FreeTierBannerProps) {
  return (
    <div className={cn(
      'rounded-xl border px-5 py-4 flex items-start gap-4 transition-colors',
      previewEnded
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-border bg-muted/30',
    )}>
      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-sm font-semibold">
          {previewEnded ? 'You\'re on the Free plan' : `Free plan · ${previewSeconds}s preview`}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {previewEnded
            ? 'Preview complete. Upgrade to Standard for the full video, complete PDF access, and quizzes.'
            : `Videos preview for ${previewSeconds} seconds. PDFs are limited to the first ${5} pages. Quizzes are locked.`}
        </p>
      </div>
      <Button asChild size="sm" variant={previewEnded ? 'default' : 'outline'} className="shrink-0">
        <Link to={ROUTES.SUBSCRIPTION}>Upgrade</Link>
      </Button>
    </div>
  )
}
