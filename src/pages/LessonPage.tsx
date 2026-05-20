import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage, FormAlert } from '@/components/ui/ErrorMessage'
import { LessonPageSkeleton } from '@/pages/LessonPageSkeleton'
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
import { getEffectivePermissions, getEffectiveTier, tierFromSubscribed, isUnlimited, isDayOneFree } from '@/features/subscription/services/accessControl'
import { getLessonWatchedStatus, markLessonWatched } from '@/services/lessonProgressApi'
import { loadResume, saveResume, clearResume } from '@/features/lessons/services/lessonResumeStorage'
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

  // Resume state — saved playback time loaded from localStorage, gated behind
  // a Continue/Start-over choice so users can recover from a dropped session.
  const [resumeAt,      setResumeAt]      = useState<number | null>(null)
  const [resumeChoice,  setResumeChoice]  = useState<'pending' | 'resolved'>('resolved')
  const [playerStartAt, setPlayerStartAt] = useState<number | undefined>(undefined)

  // Tab state — only one of reviewer/quiz is visible at a time
  const [activeTab, setActiveTab] = useState<'reviewer' | 'quiz' | null>(null)

  // Ref for scrolling to the tab panel when a tab is activated
  const tabPanelRef = useRef<HTMLDivElement>(null)

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

  // Tier comes from subscription state alone; effective permissions are
  // computed below once the lesson is loaded (Day 1 unlocks everything).
  const tier = tierFromSubscribed(isSubscribed)

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
    setActiveTab(null)
    setResumeAt(null)
    setResumeChoice('resolved')
    setPlayerStartAt(undefined)

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
      // Restore tab state for previously-watched lessons
      if (watched) {
        const defaultTab = (rc || signedPdfUrl) ? 'reviewer' : qz ? 'quiz' : null
        setActiveTab(defaultTab)
      } else {
        // Only offer resume when lesson isn't already fully watched.
        const saved = loadResume(lessonId)
        if (saved !== null) {
          setResumeAt(saved)
          setResumeChoice('pending')
        }
      }
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
      clearResume(data.lesson.id)
      // Auto-open reviewer (or quiz as fallback) after marking watched
      const defaultTab = (reviewerContent || signedPdfUrl) ? 'reviewer' : quiz ? 'quiz' : null
      setActiveTab(defaultTab)
    } catch (err) {
      console.error('Failed to save watch progress:', err)
      setIsWatched(true)
      clearResume(data.lesson.id)
      const defaultTab = (reviewerContent || signedPdfUrl) ? 'reviewer' : quiz ? 'quiz' : null
      setActiveTab(defaultTab)
    } finally {
      setMarkingWatched(false)
    }
  }

  function handleContinue() {
    if (resumeAt === null) return
    setPlayerStartAt(resumeAt)
    setResumeChoice('resolved')
  }

  function handleStartOver() {
    if (data?.lesson) clearResume(data.lesson.id)
    setPlayerStartAt(undefined)
    setResumeChoice('resolved')
  }

  function formatResumeTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (notFound) return <Navigate to="/" replace />
  if (error) return <ErrorMessage message={error} />

  if (loading || !data) {
    return <LessonPageSkeleton />
  }

  const { lesson, course, siblings, prev, next, progress } = data

  // Hard gate: free non-admin users cannot view Day 2+ lessons.
  // Day 1 is free for any authenticated user; everything else requires a sub.
  // Guests fall through to the GuestEnrollCTA below — they're not redirected.
  if (isAuthenticated && !isSubscribed && !isAdmin && !isDayOneFree(lesson, isAuthenticated)) {
    return <Navigate to={ROUTES.SUBSCRIPTION} replace />
  }

  // Effective permissions take Day 1 free-access into account.
  // When the lesson is Day 1, every authenticated user gets standard-tier
  // limits regardless of their subscription. Guests get fully locked
  // permissions — the content area renders a sign-up CTA instead.
  const permissions      = getEffectivePermissions(tier, lesson, isAuthenticated)
  const effectiveTier    = getEffectiveTier(tier, lesson, isAuthenticated)
  const dayOneBypass     = isDayOneFree(lesson, isAuthenticated)
  // For navigation / progress / banner copy we still want to know if the
  // *user* is technically subscribed vs. just getting Day 1 for free.
  const hasFullAccess    = isSubscribed || dayOneBypass

  // Full-access (subscribed OR Day 1 free): PDF + quiz unlock after marking
  // watched. Otherwise (Day 2+ on free tier): always visible (limited/locked).
  const contentUnlocked = hasFullAccess ? isWatched : true

  // Navigation: full-access needs isWatched + quiz submitted; otherwise
  // (Day 2+ on free tier) just needs preview done.
  const navReady = hasFullAccess
    ? isWatched && (quiz ? submitted : true)
    : previewEnded

  // Video preview seconds — undefined when unlimited (standard tier or Day 1)
  const videoPreviewSec = isUnlimited(permissions.videoPreviewSeconds)
    ? undefined
    : permissions.videoPreviewSeconds

  // Single completion hint shown below the quiz section
  const completionHint = getCompletionHint({
    isSubscribed: hasFullAccess, isWatched, videoProgress, quiz, submitted, previewEnded,
    previewSeconds: permissions.videoPreviewSeconds,
  })

  function handleTabChange(tab: 'reviewer' | 'quiz') {
    setActiveTab(tab)
    setTimeout(() => tabPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
                : 'bg-warning/15 text-warning',
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
            <LessonList lessons={siblings} isSubscribed={isSubscribed} isAdmin={isAdmin} activeLessonId={lesson.id} />
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

          {/* ── Guest CTA — replaces the entire interactive content block ── */}
          {!isAuthenticated ? (
            <GuestEnrollCTA lessonId={lesson.id} isDayOne={lesson.dayNumber === 1} />
          ) : (
          <>
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
              {resumeChoice === 'pending' && resumeAt !== null && (
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                  <p className="text-sm">
                    You left off at <span className="font-semibold">{formatResumeTime(resumeAt)}</span>. Continue where you stopped?
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={handleContinue}>
                      Continue from {formatResumeTime(resumeAt)}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleStartOver}>
                      Start over
                    </Button>
                  </div>
                </div>
              )}
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
                lockSeekAhead={!isWatched}
                startAt={playerStartAt}
                onTimeChange={(s) => saveResume(lesson.id, s)}
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
            hasQuiz={!!quiz}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* ── Free tier banner ── */}
          {/* Suppressed when the lesson is Day 1 (free for everyone) — the banner
              would lie about preview limits that no longer apply. */}
          {!isSubscribed && !dayOneBypass && (
            <FreeTierBanner previewEnded={previewEnded} previewSeconds={permissions.videoPreviewSeconds} />
          )}

          {/* ── Reviewer / Quiz tab panel ── */}
          {activeTab !== null && (
            <div ref={tabPanelRef}>
              {activeTab === 'reviewer' && (reviewerContent || signedPdfUrl) && (
                <ReviewerSection
                  content={reviewerContent}
                  pdfUrl={signedPdfUrl ?? undefined}
                  visible={contentUnlocked}
                  tier={effectiveTier}
                />
              )}
              {activeTab === 'quiz' && quiz && (
                <QuizComponent
                  questions={quiz.questions}
                  lessonId={lesson.id}
                  description={quiz.description}
                  randomize={quiz.randomize}
                  visible={contentUnlocked}
                  locked={!permissions.quizEnabled}
                />
              )}
            </div>
          )}

          {/* Completion hint */}
          {completionHint && (
            <p className="text-center text-xs text-muted-foreground">{completionHint}</p>
          )}

          {/* ── Navigation ── */}
          {(() => {
            // Free non-admin users hop to /subscription instead of a locked Day 2+ neighbor.
            const isNeighborUnlocked = (n: { dayNumber?: number | null }) =>
              isSubscribed || isAdmin || n.dayNumber === 1
            const prevLocked = prev ? !isNeighborUnlocked(prev) : false
            const nextLocked = next ? !isNeighborUnlocked(next) : false
            const prevTo = prev ? (prevLocked ? ROUTES.SUBSCRIPTION : ROUTES.LESSON(prev.id)) : null
            const nextTo = next ? (nextLocked ? ROUTES.SUBSCRIPTION : ROUTES.LESSON(next.id)) : null

            return (
              <div className={cn(
                'flex items-center justify-between gap-4 pt-4 border-t transition-all duration-500',
                navReady ? 'opacity-100' : 'opacity-40 pointer-events-none',
              )}>
                {prev && prevTo ? (
                  <Button asChild variant="outline" size="sm" className="max-w-[45%]">
                    <Link to={prevTo} className="flex items-center gap-1.5">
                      <ChevronLeft className="size-4 shrink-0" />
                      <span className="truncate">{prev.title}</span>
                      {prevLocked && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
                    </Link>
                  </Button>
                ) : <div />}

                {next && nextTo ? (
                  <Button asChild size="sm" className="max-w-[45%] ml-auto">
                    <Link to={nextTo} className="flex items-center gap-1.5">
                      <span className="truncate">{next.title}</span>
                      {nextLocked
                        ? <Lock className="size-3.5 shrink-0" />
                        : <ChevronRight className="size-4 shrink-0" />}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link to={ROUTES.COURSE(lesson.courseId)}>Back to Course</Link>
                  </Button>
                )}
              </div>
            )
          })()}
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
            <LessonList lessons={siblings} isSubscribed={isSubscribed} isAdmin={isAdmin} activeLessonId={lesson.id} />
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

// ── Guest CTA (replaces video/reviewer/quiz for unauthenticated visitors) ────

function GuestEnrollCTA({ lessonId, isDayOne }: { lessonId: string; isDayOne: boolean }) {
  // Preserve the lesson URL so the user lands back here after login/register
  const returnState = { state: { from: { pathname: ROUTES.LESSON(lessonId) } } }
  return (
    <div className="rounded-2xl border bg-card px-6 py-10 flex flex-col items-center text-center gap-4">
      <div className="rounded-full bg-primary/10 p-4">
        <Lock className="size-7 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-semibold">
          {isDayOne ? 'Enroll to start your free Day 1' : 'Enroll to unlock this lesson'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isDayOne
            ? 'Sign up for a free account to watch the Day 1 video, read the reviewer, and take the quiz.'
            : 'Day 2 and beyond are part of the Standard plan. Create an account to get started — Day 1 is free.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button asChild>
          <Link to={ROUTES.REGISTER} {...returnState}>Enroll Now</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={ROUTES.LOGIN} {...returnState}>I already have an account</Link>
        </Button>
      </div>
    </div>
  )
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
        ? 'border-warning/40 bg-warning/10'
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
