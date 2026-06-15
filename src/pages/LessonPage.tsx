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
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { getReviewerContent } from '@/features/lessons/services/reviewerService'
import { quizApi } from '@/services/quizApi'
import { getEffectivePermissions, getEffectiveTier, tierFromSubscribed, isUnlimited, isFreePreview } from '@/features/subscription/services/accessControl'
import { getLessonWatchedStatus, markLessonWatched } from '@/services/lessonProgressApi'
import { loadResume, saveResume, clearResume } from '@/features/lessons/services/lessonResumeStorage'
import type { ReviewerContent } from '@/features/lessons/types'
import type { Quiz } from '@/features/quiz/types'
import { cn } from '@/utils/cn'
import config from '@/config'

interface LessonPageProps {
  /**
   * Render as Landing's public preview funnel. Hard-gates non-preview lessons
   * (renders a "Preview not available" notice), wires breadcrumb/prev/next
   * to /preview/* paths, and points "Enroll" CTAs at same-origin auth.
   */
  previewMode?: boolean
}

export function LessonPage({ previewMode = false }: LessonPageProps = {}) {
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

  const handleSuspiciousCapture = useCallback(() => {
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

  // Fetch presigned R2 URLs for users entitled to play this lesson:
  //   • Subscribers / admins  → every lesson.
  //   • Free / guest          → only lessons flagged is_free_preview.
  // The Edge Function is the actual gate; this is just the client trigger.
  const lessonIsPreview = isFreePreview(data?.lesson)
  const {
    videoUrl:    signedVideoUrl,
    pdfUrl:      signedPdfUrl,
    loading:     contentLoading,
    error:       contentError,
  } = useSecureContent(lessonId ?? '', isAuthenticated || lessonIsPreview)

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
      quizApi.getByLesson(lessonId),
      isAuthenticated ? getLessonWatchedStatus(lessonId) : Promise.resolve(false),
    ]).then(([rc, qz, watched]) => {
      setReviewerContent(rc)
      setQuiz(qz)
      setIsWatched(watched)
      if (watched) {
        const defaultTab = (rc || signedPdfUrl) ? 'reviewer' : qz ? 'quiz' : null
        setActiveTab(defaultTab)
      }
      // Offer resume whenever localStorage has a position — Watched lessons
      // stay re-watchable from where the user last paused.
      const saved = loadResume(lessonId)
      if (saved !== null) {
        setResumeAt(saved)
        setResumeChoice('pending')
      }
    })
  }, [data?.lesson.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear per-lesson UI state when the user logs out while staying on this page.
  // The lesson-id reset effect above only fires on navigation, so without this
  // the prior session's Watched badge, active quiz tab, and quiz answers would
  // leak into the guest view of a free-preview lesson.
  const prevAuthRef = useRef(isAuthenticated)
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      setIsWatched(false)
      setMarkingWatched(false)
      setActiveTab(null)
      setResumeAt(null)
      setResumeChoice('resolved')
      setPlayerStartAt(undefined)
      setPreviewEnded(false)
      setVideoProgress(0)
      useQuizStore.getState().resetQuiz()
    }
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated])

  // ── Mark as Watched handler ──────────────────────────────────────────────
  async function handleMarkWatched() {
    if (!data?.lesson || isWatched || markingWatched) return
    setMarkingWatched(true)
    try {
      // Persistence is for enrolled users only — guests and authenticated
      // free-tier users (on a preview lesson) get a client-only "watched"
      // toggle so the UI advances, but no completion record is written.
      if (isSubscribed || isAdmin) {
        await markLessonWatched(data.lesson.id)
      }
      setIsWatched(true)
      // Auto-open reviewer (or quiz as fallback) after marking watched
      const defaultTab = (reviewerContent || signedPdfUrl) ? 'reviewer' : quiz ? 'quiz' : null
      setActiveTab(defaultTab)
    } catch (err) {
      console.error('Failed to save watch progress:', err)
      setIsWatched(true)
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

  const { lesson, subject, siblings, prev, next, progress } = data

  // Hard gate: authenticated free users (no subscription, not admin) cannot
  // view a lesson unless it's flagged is_free_preview. Guests fall through
  // to the GuestEnrollCTA when the lesson is NOT a preview, or to the
  // normal content view when it IS — no redirect, no flash.
  const previewBypass = isFreePreview(lesson)
  if (isAuthenticated && !isSubscribed && !isAdmin && !previewBypass) {
    return <Navigate to={ROUTES.SUBSCRIPTION} replace />
  }

  // Landing's /preview/lesson/:id only serves free-preview lessons. If the
  // URL points at a premium lesson, render a clear "not available" notice
  // with a cross-origin enroll CTA — no redirect, so the URL stays canonical
  // and crawlers don't get a soft-404.
  if (previewMode && !previewBypass) {
    return <PreviewNotAvailable subjectId={lesson.courseId} />
  }

  // Effective permissions take is_free_preview into account: preview lessons
  // grant standard-tier limits to every caller (guests included) so the video
  // plays in full. Non-preview lessons follow the caller's tier; guests get
  // fully locked permissions and see the GuestEnrollCTA instead of content.
  const permissions      = getEffectivePermissions(tier, lesson, isAuthenticated)
  const effectiveTier    = getEffectiveTier(tier, lesson, isAuthenticated)
  // For navigation / progress / banner copy we still want to know if the
  // *user* is technically subscribed vs. just getting a free preview.
  const hasFullAccess    = isSubscribed || previewBypass

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

  const position = `${data.currentIdx + 1} / ${siblings.length}`

  const stickyOffset = 'top-[var(--site-navbar-height)]'
  const stickyPanelHeight = 'max-h-[calc(100vh-var(--site-navbar-height))]'
  const rightPanelSticky = cn('sticky flex flex-col', stickyOffset, stickyPanelHeight)

  const subjectHref = previewMode
    ? ROUTES.PREVIEW_SUBJECT(lesson.courseId)
    : isAuthenticated
      ? ROUTES.PORTAL_SUBJECT(lesson.courseId)
      : ROUTES.SUBJECT(lesson.courseId)

  const lessonBreadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
      {isAuthenticated ? (
        <>
          <Link to={ROUTES.DASHBOARD} className="hover:text-foreground transition-colors hidden md:inline">
            Dashboard
          </Link>
          <ChevronRight className="size-3 shrink-0 hidden md:inline" aria-hidden="true" />
          <Link to={ROUTES.PORTAL_SUBJECTS} className="hover:text-foreground transition-colors hidden sm:inline">
            Subjects
          </Link>
        </>
      ) : (
        <Link to={previewMode ? '/' : ROUTES.SUBJECTS} className="hover:text-foreground transition-colors hidden sm:inline">
          {previewMode ? 'Home' : 'Subjects'}
        </Link>
      )}
      <ChevronRight className="size-3 shrink-0 hidden sm:inline" aria-hidden="true" />
      <Link
        to={subjectHref}
        className="hover:text-foreground transition-colors truncate"
      >
        {subject?.title ?? 'Subject'}
      </Link>
      <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
      <span className="text-foreground truncate" aria-current="page">{lesson.title}</span>
    </nav>
  )

  const layout = (
    <div className={cn(
      'flex flex-col lg:flex-row',
      'min-h-[calc(100vh-var(--site-navbar-height))]',
    )}>
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">

        {/* Lesson sticky header */}
        <div className={cn(
          'sticky z-10 border-b bg-background/95 backdrop-blur px-4 py-2.5 flex items-center gap-3',
          stickyOffset,
        )}>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-border/70 bg-card/60 px-3 text-muted-foreground shadow-none hover:bg-accent/60 hover:text-foreground"
          >
            <Link to={subjectHref}>
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">{subject?.title ?? 'Subject'}</span>
            </Link>
          </Button>

          <div className="flex-1 min-w-0">
            <div className="hidden sm:block">
              {isAuthenticated ? (
                lessonBreadcrumb
              ) : (
                <p className="text-sm font-medium truncate">{lesson.title}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              isSubscribed
                ? 'bg-primary/10 text-primary'
                : 'bg-warning/15 text-warning',
            )}>
              {isSubscribed ? 'Standard' : 'Free'}
            </span>

            <span className="text-xs text-muted-foreground">{position}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 lg:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Lesson list"
          >
            <List className="size-4" />
          </Button>
        </div>

        {/* Mobile lesson sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden border-b bg-card px-3 py-3 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 pb-2">
              {subject?.title}
            </p>
            <LessonList
              lessons={siblings}
              isSubscribed={isSubscribed}
              isAdmin={isAdmin}
              activeLessonId={lesson.id}
              previewMode={previewMode}
            />
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-8 max-w-3xl mx-auto space-y-8">
          {/* Breadcrumb — guests only; authenticated users get it in the sticky lesson header. */}
          {!isAuthenticated && (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Link to={previewMode ? '/' : ROUTES.SUBJECTS} className="hover:text-foreground transition-colors">
                {previewMode ? 'Home' : 'Subjects'}
              </Link>
              <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              <Link
                to={previewMode ? ROUTES.PREVIEW_SUBJECT(lesson.courseId) : ROUTES.SUBJECT(lesson.courseId)}
                className="hover:text-foreground transition-colors"
              >
                {subject?.title ?? 'Subject'}
              </Link>
              <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              <span className="text-foreground" aria-current="page">{lesson.title}</span>
            </nav>
          )}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Lesson {lesson.order} · {lesson.duration}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{lesson.description}</p>
          </div>

          {/* ── Guest CTA — replaces content only for guests on non-preview lessons.
              Guests on free-preview lessons fall through to the normal content
              view; a non-blocking PreviewConversionBanner is rendered below.
              In previewMode the page already short-circuits to PreviewNotAvailable
              above, so this branch only fires for non-preview Portal guests. ── */}
          {!isAuthenticated && !previewBypass ? (
            <GuestEnrollCTA lessonId={lesson.id} previewMode={previewMode} />
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
                thumbnail={subject?.thumbnail ?? 'from-gray-400 to-gray-500'}
                src={signedVideoUrl ?? undefined}
                durationSeconds={30}
                onEnded={() => { setVideoProgress(100); clearResume(lesson.id) }}
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
          {/* Suppressed on free-preview lessons — the preview cap copy would
              lie about limits that don't apply (preview lessons play in full).
              Also suppressed for guests; the PreviewConversionBanner below
              owns the guest call-to-action. */}
          {isAuthenticated && !isSubscribed && !previewBypass && (
            <FreeTierBanner previewEnded={previewEnded} previewSeconds={permissions.videoPreviewSeconds} />
          )}

          {/* ── Preview conversion CTA — non-blocking, never gates playback. ── */}
          {previewBypass && !isSubscribed && (
            <PreviewConversionBanner
              isAuthenticated={isAuthenticated}
              lessonId={lesson.id}
              previewMode={previewMode}
            />
          )}

          {/* ── Reviewer / Quiz tab panel ── */}
          {activeTab !== null && (
            <div ref={tabPanelRef} className="scroll-mt-[calc(var(--site-navbar-height)+1rem)]">
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
                  persistResults={isSubscribed || isAdmin}
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
            // Free non-admin users hop to /subscription instead of a locked
            // premium neighbor. Preview neighbors stay reachable directly.
            // In previewMode (Landing) only flagged previews are "unlocked";
            // locked neighbors send the visitor cross-origin to portal /register.
            const isNeighborUnlocked = (n: { isFreePreview?: boolean }) =>
              previewMode ? n.isFreePreview === true : (isSubscribed || isAdmin || n.isFreePreview === true)
            const prevLocked = prev ? !isNeighborUnlocked(prev) : false
            const nextLocked = next ? !isNeighborUnlocked(next) : false

            const unlockedHref = (id: string) =>
              previewMode ? ROUTES.PREVIEW_LESSON(id) : ROUTES.LESSON(id)
            const lockedHref = previewMode
              ? getAbsoluteUrl(withReturnParam(ROUTES.REGISTER, ROUTES.SUBJECT(lesson.courseId)))
              : ROUTES.SUBSCRIPTION
            const backToSubjectTo = subjectHref

            // In previewMode the locked target is cross-origin; render as <a>.
            const NavLink = ({
              to,
              className,
              children,
            }: {
              to: string
              className?: string
              children: ReactNode
            }) => {
              if (previewMode && /^https?:\/\//.test(to)) {
                return <a href={to} className={className}>{children}</a>
              }
              return <Link to={to} className={className}>{children}</Link>
            }

            const prevTo = prev ? (prevLocked ? lockedHref : unlockedHref(prev.id)) : null
            const nextTo = next ? (nextLocked ? lockedHref : unlockedHref(next.id)) : null

            return (
              <div className={cn(
                'flex items-center justify-between gap-4 pt-4 border-t transition-all duration-500',
                navReady ? 'opacity-100' : 'opacity-40 pointer-events-none',
              )}>
                {prev && prevTo ? (
                  <Button asChild variant="outline" size="sm" className="max-w-[45%]">
                    <NavLink to={prevTo} className="flex items-center gap-1.5">
                      <ChevronLeft className="size-4 shrink-0" />
                      <span className="truncate">{prev.title}</span>
                      {prevLocked && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
                    </NavLink>
                  </Button>
                ) : <div />}

                {next && nextTo ? (
                  <Button asChild size="sm" className="max-w-[45%] ml-auto">
                    <NavLink to={nextTo} className="flex items-center gap-1.5">
                      <span className="truncate">{next.title}</span>
                      {nextLocked
                        ? <Lock className="size-3.5 shrink-0" />
                        : <ChevronRight className="size-4 shrink-0" />}
                    </NavLink>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link to={backToSubjectTo}>Back to Subject</Link>
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
        <div className={rightPanelSticky}>
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Course Content
            </p>
            <p className="text-sm font-medium mt-0.5 truncate">{subject?.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{progress}%</span>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3">
            <LessonList
              lessons={siblings}
              isSubscribed={isSubscribed}
              isAdmin={isAdmin}
              activeLessonId={lesson.id}
              previewMode={previewMode}
            />
          </div>
        </div>
      </aside>
    </div>
  )

  return layout
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

// ── Guest CTA (replaces video/reviewer/quiz for unauthenticated visitors
//     on non-preview lessons) ────────────────────────────────────────────────

function GuestEnrollCTA({ lessonId, previewMode = false }: { lessonId: string; previewMode?: boolean }) {
  // Preserve the lesson URL so the user lands back here after login/register
  const loginTo = withReturnParam(ROUTES.LOGIN, ROUTES.LESSON(lessonId))
  const registerTo = withReturnParam(ROUTES.REGISTER, ROUTES.LESSON(lessonId))
  // In previewMode the page is hosted on Landing and auth routes live on the
  // same origin; absolute URLs keep this safe in local/preview deployments.
  if (previewMode) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-10 flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <Lock className="size-7 text-primary" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-lg font-semibold">Enroll to unlock this lesson</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This lesson is part of the Standard plan. Create an account and enroll
            to watch the video, read the reviewer, and take the quiz.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button asChild>
            <a href={getAbsoluteUrl(registerTo)}>Enroll Now</a>
          </Button>
          <Button asChild variant="outline">
            <a href={getAbsoluteUrl(loginTo)}>I already have an account</a>
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border bg-card px-6 py-10 flex flex-col items-center text-center gap-4">
      <div className="rounded-full bg-primary/10 p-4">
        <Lock className="size-7 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-semibold">Enroll to unlock this lesson</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This lesson is part of the Standard plan. Create an account and enroll
          to watch the video, read the reviewer, and take the quiz.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button asChild>
          <Link to={registerTo}>Enroll Now</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={loginTo}>I already have an account</Link>
        </Button>
      </div>
    </div>
  )
}

// ── Preview-not-available notice ─────────────────────────────────────────────
//
// Rendered on Landing's /preview/lesson/:id when the requested lesson is NOT
// flagged is_free_preview. Stays at the same URL (no redirect) so the
// canonical link is stable; CTA is a cross-origin hop to portal /register.

function PreviewNotAvailable({ subjectId }: { subjectId: string }) {
  const registerTo = withReturnParam(ROUTES.REGISTER, ROUTES.SUBJECT(subjectId))

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="rounded-2xl border bg-card px-6 py-12 flex flex-col items-center text-center gap-5">
        <div className="rounded-full bg-muted p-4">
          <Lock className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-xl font-semibold">Preview not available</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This lesson is part of the Standard plan. Browse the free preview
            for this subject, or enroll to unlock the full curriculum.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button asChild>
            <a href={getAbsoluteUrl(registerTo)}>Enroll Now</a>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.PREVIEW_SUBJECT(subjectId)}>Browse subject preview</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Preview conversion banner (non-blocking; never gates playback) ───────────
//
// Shown only on free-preview lessons when the user is not subscribed:
//   • Guests             → "Create an account to save progress" → /register
//   • Authenticated free → "Enroll to unlock the rest"           → /subscription
//
// Subscribers never see it. Always rendered below the video — playback is
// fully usable while it's visible.

function PreviewConversionBanner({
  isAuthenticated,
  lessonId,
  previewMode = false,
}: {
  isAuthenticated: boolean
  lessonId: string
  previewMode?: boolean
}) {
  const registerTo = withReturnParam(ROUTES.REGISTER, ROUTES.LESSON(lessonId))

  if (!isAuthenticated) {
    // On Landing's /preview/lesson/:id the auth routes live cross-origin;
    // use absolute portal URL via <a href>.
    if (previewMode) {
      return (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold">Enjoying the free preview?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enroll an account to save your progress and pick up where you left off.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <a href={getAbsoluteUrl(registerTo)}>Enroll Now</a>
          </Button>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold">Enjoying the free preview?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enroll an account to save your progress and pick up where you left off.
          </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={registerTo}>Enroll Now</Link>
      </Button>
    </div>
  )
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold">Ready for the rest of the subject?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Enroll to unlock every lesson, the full reviewer PDF, and the quizzes.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={ROUTES.SUBSCRIPTION}>Upgrade Now</Link>
      </Button>
    </div>
  )
}

function withReturnParam(path: string, returnTo: string): string {
  return `${path}?return=${encodeURIComponent(returnTo)}`
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
