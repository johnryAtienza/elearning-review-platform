import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, List, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LessonPageSkeleton } from '@/pages/LessonPageSkeleton'
import { VideoPlayer, VideoEmptyState, VideoPlaybackErrorState } from '@/features/lessons/components/VideoPlayer'
import { QuizComponent } from '@/features/quiz/components/QuizComponent'
import { LessonList } from '@/features/lessons/components/LessonList'
import { LessonCTAs } from '@/features/lessons/components/LessonCTAs'
import { ContentWatermark } from '@/components/ContentWatermark'
import { useLesson } from '@/features/lessons/hooks/useLesson'
import { useSecureContent } from '@/features/lessons/hooks/useSecureContent'
import { useQuizStore } from '@/store/quizStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { quizApi } from '@/services/quizApi'
import { getEffectivePermissions, tierFromSubscribed, isUnlimited, isFreePreview } from '@/features/subscription/services/accessControl'
import { getLessonWatchedStatus, markLessonWatched } from '@/services/lessonProgressApi'
import { loadResume, saveResume, clearResume } from '@/features/lessons/services/lessonResumeStorage'
import type { ProblemSet } from '@/features/quiz/types'
import type { Lesson } from '@/features/lessons/types'
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

interface ProblemSetCategoryGroup {
  id: string
  name: string
  sortOrder: number
  questionCount: number
  problemSets: ProblemSet[]
}

type LessonVideoState = 'loading' | 'ready' | 'noVideo' | 'playbackError'

function hasVideoReference(lesson: Lesson | undefined): boolean {
  if (!lesson) return false
  if (typeof lesson.hasVideo === 'boolean') return lesson.hasVideo
  return typeof lesson.videoUrl === 'string' && lesson.videoUrl.trim().length > 0
}

function groupProblemSets(problemSets: ProblemSet[]): ProblemSetCategoryGroup[] {
  const groups = new Map<string, ProblemSetCategoryGroup>()

  for (const problemSet of problemSets) {
    const group = groups.get(problemSet.categoryId) ?? {
      id:            problemSet.categoryId,
      name:          problemSet.categoryName,
      sortOrder:     problemSet.categorySortOrder,
      questionCount: 0,
      problemSets:   [],
    }

    group.questionCount += problemSet.questionCount
    group.problemSets.push(problemSet)
    groups.set(problemSet.categoryId, group)
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      problemSets: [...group.problemSets].sort((a, b) =>
        a.sortOrder - b.sortOrder
        || a.title.localeCompare(b.title)
      ),
    }))
    .sort((a, b) =>
      a.sortOrder - b.sortOrder
      || a.name.localeCompare(b.name)
    )
}

function getFirstProblemSetSelection(problemSets: ProblemSet[]) {
  const firstGroup = groupProblemSets(problemSets)[0]
  const firstSet = firstGroup?.problemSets[0] ?? null
  return {
    categoryId: firstGroup?.id ?? null,
    problemSet: firstSet,
  }
}

export function LessonPage({ previewMode = false }: LessonPageProps = {}) {
  const { lessonId } = useParams<{ lessonId: string }>()

  // ── Per-lesson UI state ──────────────────────────────────────────────────
  const [videoProgress,   setVideoProgress]   = useState(0)
  const [previewEnded,    setPreviewEnded]     = useState(false)
  const [playerFailed,    setPlayerFailed]     = useState(false)
  const [playbackRetrying, setPlaybackRetrying] = useState(false)
  const [sidebarOpen,     setSidebarOpen]      = useState(false)
  const [problemSets,     setProblemSets]     = useState<ProblemSet[]>([])

  // Watched state — loaded from backend, persisted on user action
  const [isWatched,      setIsWatched]      = useState(false)
  const [markingWatched, setMarkingWatched] = useState(false)

  // Resume state — saved playback time loaded from localStorage, gated behind
  // a Continue/Start-over choice so users can recover from a dropped session.
  const [resumeAt,      setResumeAt]      = useState<number | null>(null)
  const [resumeChoice,  setResumeChoice]  = useState<'pending' | 'resolved'>('resolved')
  const [playerStartAt, setPlayerStartAt] = useState<number | undefined>(undefined)

  // Tab state — categories drive tabs; a category may contain multiple sets
  const [activeCategoryId,  setActiveCategoryId]  = useState<string | null>(null)
  const [activeProblemSetId, setActiveProblemSetId] = useState<string | null>(null)

  // Ref for scrolling to the tab panel when a tab is activated
  const tabPanelRef = useRef<HTMLDivElement>(null)

  const setLessonId = useQuizStore((s) => s.setLessonId)
  const submitted   = useQuizStore((s) => s.submitted)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSubscribed    = useAuthStore((s) => s.isSubscribed)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const user            = useAuthStore((s) => s.user)

  // Watermarking is a configurable deterrent layered on top of the actual
  // DRM/access-control boundary. It is never used as screenshot prevention.
  const protectionActive = config.protection.enabled && isSubscribed && !isAdmin

  // Tier comes from subscription state alone; effective permissions are
  // computed below once the lesson is loaded (Day 1 unlocks everything).
  const tier = tierFromSubscribed(isSubscribed)

  const { data, loading, notFound, error } = useLesson(lessonId ?? '')

  // Fetch presigned R2 URLs for users entitled to play this lesson:
  //   • Subscribers / admins  → every lesson.
  //   • Free / guest          → only lessons flagged is_free_preview.
  // The Edge Function is the actual gate; this is just the client trigger.
  const lessonIsPreview = isFreePreview(data?.lesson)
  const lessonHasVideo = hasVideoReference(data?.lesson)
  const {
    videoUrl:    signedVideoUrl,
    playback,
    loading:     contentLoading,
    error:       contentError,
    retry:       retrySecureContent,
  } = useSecureContent(lessonId ?? '', lessonHasVideo && (isAuthenticated || lessonIsPreview))

  // Reset per-lesson state and reload backend progress when lesson changes
  useEffect(() => {
    if (!data?.lesson) return

    setLessonId(data.lesson.id)
    setVideoProgress(0)
    setPreviewEnded(false)
    setPlayerFailed(false)
    setPlaybackRetrying(false)
    setIsWatched(false)
    setMarkingWatched(false)
    setProblemSets([])
    setActiveCategoryId(null)
    setActiveProblemSetId(null)
    setResumeAt(null)
    setResumeChoice('resolved')
    setPlayerStartAt(undefined)

    const lessonId = data.lesson.id

    Promise.all([
      quizApi.getProblemSetsByLesson(lessonId),
      isAuthenticated ? getLessonWatchedStatus(lessonId) : Promise.resolve(false),
    ]).then(([sets, watched]) => {
      setProblemSets(sets)
      setIsWatched(watched)
      if (watched) {
        const defaultSelection = getFirstProblemSetSelection(sets)
        if (defaultSelection.problemSet) setLessonId(defaultSelection.problemSet.id)
        setActiveCategoryId(defaultSelection.categoryId)
        setActiveProblemSetId(defaultSelection.problemSet?.id ?? null)
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
  // the prior session's Watched badge, active problem set tab, and answers would
  // leak into the guest view of a free-preview lesson.
  const prevAuthRef = useRef(isAuthenticated)
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      setIsWatched(false)
      setMarkingWatched(false)
      setActiveCategoryId(null)
      setActiveProblemSetId(null)
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
      // Auto-open the first configured category/problem set after marking watched.
      const defaultSelection = getFirstProblemSetSelection(problemSets)
      if (defaultSelection.problemSet) setLessonId(defaultSelection.problemSet.id)
      setActiveCategoryId(defaultSelection.categoryId)
      setActiveProblemSetId(defaultSelection.problemSet?.id ?? null)
    } catch (err) {
      console.error('Failed to save watch progress:', err)
      setIsWatched(true)
      const defaultSelection = getFirstProblemSetSelection(problemSets)
      if (defaultSelection.problemSet) setLessonId(defaultSelection.problemSet.id)
      setActiveCategoryId(defaultSelection.categoryId)
      setActiveProblemSetId(defaultSelection.problemSet?.id ?? null)
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

  function handleRetryPlayback() {
    setPlayerFailed(false)
    setPlaybackRetrying(true)
    retrySecureContent()
  }

  useEffect(() => {
    if (playbackRetrying && !contentLoading) {
      setPlaybackRetrying(false)
    }
  }, [playbackRetrying, contentLoading])

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
  const canFetchPlayback = lessonHasVideo && (isAuthenticated || lessonIsPreview)
  const videoState: LessonVideoState = !lessonHasVideo
    ? 'noVideo'
    : contentLoading || playbackRetrying || (canFetchPlayback && !contentError && !playerFailed && !signedVideoUrl && !playback)
      ? 'loading'
      : playerFailed || contentError || (!signedVideoUrl && !playback)
        ? 'playbackError'
        : 'ready'

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
  // For navigation / progress / banner copy we still want to know if the
  // *user* is technically subscribed vs. just getting a free preview.
  const hasFullAccess    = isSubscribed || previewBypass

  // Full-access (subscribed OR Day 1 free): problem sets unlock after marking
  // watched. Otherwise (Day 2+ on free tier): always visible (limited/locked).
  const contentUnlocked = hasFullAccess ? isWatched : true
  const problemSetGroups = groupProblemSets(problemSets)
  const activeGroup = problemSetGroups.find((group) => group.id === activeCategoryId) ?? null
  const activeProblemSet =
    activeGroup?.problemSets.find((set) => set.id === activeProblemSetId)
    ?? activeGroup?.problemSets[0]
    ?? null

  // Navigation: full-access needs isWatched + active problem set submitted; otherwise
  // (Day 2+ on free tier) just needs preview done.
  const navReady = hasFullAccess
    ? isWatched && (problemSets.length > 0 ? submitted : true)
    : previewEnded

  // Video preview seconds — undefined when unlimited (standard tier or Day 1)
  const videoPreviewSec = isUnlimited(permissions.videoPreviewSeconds)
    ? undefined
    : permissions.videoPreviewSeconds

  // Single completion hint shown below the problem set section
  const completionHint = getCompletionHint({
    isSubscribed: hasFullAccess, isWatched, videoProgress, problemSetCount: problemSets.length, submitted, previewEnded,
    previewSeconds: permissions.videoPreviewSeconds,
  })

  function handleTabChange(tab: string) {
    const group = problemSetGroups.find((item) => item.id === tab)
    const firstProblemSet = group?.problemSets[0] ?? null

    setActiveCategoryId(tab)
    setActiveProblemSetId(firstProblemSet?.id ?? null)
    if (firstProblemSet) setLessonId(firstProblemSet.id)
    setTimeout(() => tabPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function handleProblemSetChange(problemSetId: string) {
    setActiveProblemSetId(problemSetId)
    setLessonId(problemSetId)
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
          <Button asChild size="sm">
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
          {/* ── Video ── */}
          {videoState === 'loading' ? (
            <Skeleton className="aspect-video w-full rounded-xl" />
          ) : videoState === 'noVideo' ? (
            <VideoEmptyState />
          ) : videoState === 'playbackError' ? (
            <VideoPlaybackErrorState onRetry={handleRetryPlayback} />
          ) : (
            <div
              className="relative"
            >
              {resumeChoice === 'pending' && resumeAt !== null && videoState === 'ready' && (
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
                playback={playback}
                durationSeconds={30}
                onEnded={() => { setVideoProgress(100); clearResume(lesson.id) }}
                previewDuration={videoPreviewSec}
                onPreviewEnded={() => setPreviewEnded(true)}
                onProgress={setVideoProgress}
                lockSeekAhead={!isWatched}
                startAt={playerStartAt}
                onTimeChange={(s) => saveResume(lesson.id, s)}
                onPlaybackError={() => setPlayerFailed(true)}
                onRetry={handleRetryPlayback}
              />
              <ContentWatermark
                label={playback?.watermarkLabel ?? maskWatermarkLabel(user?.email ?? user?.id ?? '')}
                enabled={protectionActive && config.protection.watermark}
              />
            </div>
          )}

          {/* ── CTA action bar ── */}
          {videoState === 'ready' && (
            <LessonCTAs
              videoProgress={videoProgress}
              isWatched={isWatched}
              markingWatched={markingWatched}
              onMarkWatched={handleMarkWatched}
              tabs={problemSetGroups.map((group) => ({
                id:            group.id,
                label:         group.name,
                questionCount: group.questionCount,
              }))}
              activeTab={activeCategoryId}
              onTabChange={handleTabChange}
            />
          )}

          {/* ── Free tier banner ── */}
          {/* Suppressed on free-preview lessons — the preview cap copy would
              lie about limits that don't apply (preview lessons play in full).
              Also suppressed for guests; the PreviewConversionBanner below
              owns the guest call-to-action. */}
          {videoState === 'ready' && isAuthenticated && !isSubscribed && !previewBypass && (
            <FreeTierBanner previewEnded={previewEnded} previewSeconds={permissions.videoPreviewSeconds} />
          )}

          {/* ── Preview conversion CTA — non-blocking, never gates playback. ── */}
          {videoState === 'ready' && previewBypass && !isSubscribed && (
            <PreviewConversionBanner
              isAuthenticated={isAuthenticated}
              lessonId={lesson.id}
              previewMode={previewMode}
            />
          )}

          {/* ── Lesson action tab panel ── */}
          {activeProblemSet && (
            <div ref={tabPanelRef} className="scroll-mt-[calc(var(--site-navbar-height)+1rem)] space-y-5">
              {activeGroup && activeGroup.problemSets.length > 1 && (
                <ProblemSetPicker
                  problemSets={activeGroup.problemSets}
                  activeProblemSetId={activeProblemSet.id}
                  onSelect={handleProblemSetChange}
                />
              )}
              <QuizComponent
                key={activeProblemSet.id}
                title={activeProblemSet.title}
                quizId={activeProblemSet.id}
                questions={activeProblemSet.questions}
                lessonId={lesson.id}
                description={activeProblemSet.description}
                randomize={activeProblemSet.randomize}
                visible={contentUnlocked}
                locked={!permissions.quizEnabled}
                persistResults={isAuthenticated && (isAdmin || hasFullAccess)}
              />
            </div>
          )}

          {/* Completion hint */}
          {videoState === 'ready' && completionHint && (
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

function maskWatermarkLabel(value: string): string {
  if (!value) return ''
  const at = value.indexOf('@')
  if (at > 0) return `${value.slice(0, 1)}***${value.slice(at)}`
  return `${value.slice(0, 4)}…`
}

// ── Completion hint ───────────────────────────────────────────────────────────

function getCompletionHint({
  isSubscribed, isWatched, videoProgress, problemSetCount, submitted, previewEnded, previewSeconds,
}: {
  isSubscribed: boolean
  isWatched: boolean
  videoProgress: number
  problemSetCount: number
  submitted: boolean
  previewEnded: boolean
  previewSeconds: number
}): ReactNode {
  if (isSubscribed) {
    if (!isWatched && videoProgress < 95)
      return <>Watch at least 95% of the video, then click <strong>Mark as Watched</strong> to unlock the problem sets.</>
    if (!isWatched)
      return <>Click <strong>Mark as Watched</strong> to unlock the problem sets.</>
    if (problemSetCount > 0 && !submitted)
      return 'Submit the active problem set to unlock navigation.'
    return null
  }
  return !previewEnded ? `Watch the ${previewSeconds}s preview to continue.` : null
}

// ── Problem set selector ─────────────────────────────────────────────────────

function ProblemSetPicker({
  problemSets,
  activeProblemSetId,
  onSelect,
}: {
  problemSets: ProblemSet[]
  activeProblemSetId: string
  onSelect: (problemSetId: string) => void
}) {
  return (
    <div className="rounded-xl border bg-card/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Problem Sets</p>
        <span className="text-xs text-muted-foreground">
          {problemSets.length} set{problemSets.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {problemSets.map((problemSet) => {
          const active = problemSet.id === activeProblemSetId

          return (
            <button
              key={problemSet.id}
              type="button"
              onClick={() => onSelect(problemSet.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium">{problemSet.title}</span>
                <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-xs tabular-nums">
                  {problemSet.questionCount}
                </span>
              </div>
              {problemSet.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {problemSet.description}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Guest CTA (replaces video/problem sets for unauthenticated visitors
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
            to watch the video and work through the problem sets.
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
          to watch the video and work through the problem sets.
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
          Enroll to unlock every lesson and the problem sets.
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
            ? 'Preview complete. Upgrade to Standard for the full video and problem sets.'
            : `Videos preview for ${previewSeconds} seconds. Problem sets are locked.`}
        </p>
      </div>
      <Button asChild size="sm" variant={previewEnded ? 'default' : 'outline'} className="shrink-0">
        <Link to={ROUTES.SUBSCRIPTION}>Upgrade</Link>
      </Button>
    </div>
  )
}
