import { Link } from 'react-router-dom'
import { PlayCircle, FileText, ListChecks, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { cn } from '@/utils/cn'
import type { Lesson } from '@/features/lessons/types'

/**
 * Shared curriculum grid (week → day cards) used by both the public
 * SubjectDetailPage and the authenticated PortalSubjectHubPage.
 *
 * Prefers `lesson.weekNumber`. Falls back to `ceil(order / DAYS_PER_WEEK)`
 * for any lesson row that hasn't been backfilled yet so the page still
 * renders correctly. `DAYS_PER_WEEK = 6` matches the client wireframe
 * (Day 6 = Week 1 Exam, Day 12 = Week 2 Exam, etc.).
 */
const DAYS_PER_WEEK = 6
const EMPTY_WATCHED_LESSON_IDS: ReadonlySet<string> = new Set()

export interface WeekGroup {
  weekNumber: number
  lessons: Lesson[]
}

export function effectiveWeek(lesson: Lesson): number {
  return lesson.weekNumber ?? Math.max(1, Math.ceil(lesson.order / DAYS_PER_WEEK))
}

export function effectiveDay(lesson: Lesson): number {
  return lesson.dayNumber ?? lesson.order
}

function isExamLesson(lesson: Lesson): boolean {
  return /\bexam\b/i.test(lesson.title)
}

export function groupLessonsByWeek(lessons: Lesson[]): WeekGroup[] {
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

// ── Week block ───────────────────────────────────────────────────────────────

interface WeekBlockProps {
  group: WeekGroup
  isSubscribed: boolean
  isAuthenticated: boolean
  /**
   * Enables sequential curriculum locking for active Standard users.
   * When enabled, lessons require prior video lessons to have an `is_watched`
   * progress row. Weekly exams only check prior same-week lesson videos.
   */
  sequentialUnlockEnabled?: boolean
  watchedLessonIds?: ReadonlySet<string>
  previousSubjectLessons?: Lesson[]
  showWatchStatus?: boolean
  /**
   * When true, lesson cards render for the public preview funnel on Landing:
   * unlocked previews route to /preview/lesson/:id; locked lessons cross-origin
   * to portal /register. Used by Landing's /preview/subject/:id route.
   */
  previewMode?: boolean
}

export function WeekBlock({
  group,
  isSubscribed,
  isAuthenticated,
  sequentialUnlockEnabled = false,
  watchedLessonIds = EMPTY_WATCHED_LESSON_IDS,
  previousSubjectLessons = [],
  showWatchStatus = false,
  previewMode,
}: WeekBlockProps) {
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
        {group.lessons.map((lesson, index) => (
          <DayCard
            key={lesson.id}
            lesson={lesson}
            previousWeekLessons={group.lessons.slice(0, index)}
            previousSubjectLessons={previousSubjectLessons}
            isLastInWeek={index === group.lessons.length - 1}
            isSubscribed={isSubscribed}
            isAuthenticated={isAuthenticated}
            sequentialUnlockEnabled={sequentialUnlockEnabled}
            watchedLessonIds={watchedLessonIds}
            showWatchStatus={showWatchStatus}
            previewMode={previewMode}
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
//   - Standard sequence → when enabled, require previous lesson videos to
//                          be watched before the next card can navigate.
//   - Anyone, Day 1     → navigate to the lesson (free for everyone).
//   - Free user, Day 2+ → render as a non-interactive locked card with a
//                          link out to /subscription on the action affordance.
//   - Guests            → can browse but click follows the same rules; the
//                          /lesson/:id route guard sends them to /login.

interface DayCardProps {
  lesson: Lesson
  previousWeekLessons: Lesson[]
  previousSubjectLessons: Lesson[]
  isLastInWeek: boolean
  isSubscribed: boolean
  isAuthenticated: boolean
  sequentialUnlockEnabled?: boolean
  watchedLessonIds?: ReadonlySet<string>
  showWatchStatus?: boolean
  previewMode?: boolean
}

export function DayCard({
  lesson,
  previousWeekLessons,
  previousSubjectLessons,
  isLastInWeek,
  isSubscribed,
  isAuthenticated,
  sequentialUnlockEnabled = false,
  watchedLessonIds = EMPTY_WATCHED_LESSON_IDS,
  showWatchStatus = false,
  previewMode,
}: DayCardProps) {
  const isExam       = isExamLesson(lesson)
  const isWeeklyExam = isExam && isLastInWeek
  const day          = effectiveDay(lesson)
  const isPreview    = lesson.isFreePreview === true
  const isWatched    = watchedLessonIds.has(lesson.id)
  // Free-preview lessons unlock for everyone — guests, free-tier auth, and
  // subscribers alike. Premium lessons require a subscription. In Landing's
  // public preview funnel only preview-flagged lessons are actually unlocked.
  const subscriptionUnlocked = previewMode ? isPreview : (isSubscribed || isPreview)
  const previousLessonsForUnlock = isWeeklyExam
    ? previousWeekLessons
    : [...previousSubjectLessons, ...previousWeekLessons]
  const sequenceLocked = sequentialUnlockEnabled
    && subscriptionUnlocked
    && previousLessonsForUnlock.some((previousLesson) => (
      !isExamLesson(previousLesson) && !watchedLessonIds.has(previousLesson.id)
    ))
  const unlocked = subscriptionUnlocked && !sequenceLocked
  const statusBadge = showWatchStatus && unlocked
    ? getWatchStatusBadge({
      isWatched,
      isExam: isWeeklyExam,
    })
    : null

  const cardBase = 'group flex flex-col gap-2 rounded-xl border p-4 transition-colors'
  const sharedFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  const header = (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        Day {day}
      </span>
      <div className="flex items-center gap-1.5">
        {isExam && <Badge variant="warning">Exam</Badge>}
        {!isExam && isPreview && !isSubscribed && <Badge variant="success">Free Preview</Badge>}
        {statusBadge}
        {!unlocked && (
          <Lock
            className="size-3.5 text-muted-foreground"
            aria-label={sequenceLocked ? 'Complete previous lesson to unlock' : 'Enroll to unlock'}
          />
        )}
      </div>
    </div>
  )

  const title = (
    <h4 className={cn(
      'text-sm font-semibold leading-snug line-clamp-2 transition-colors',
      unlocked && 'group-hover:text-primary',
      !unlocked && 'text-muted-foreground',
    )}>
      {lesson.title}
    </h4>
  )

  const regularContentTypes = (
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

  const examCovers = (
    <div className="mt-auto space-y-1 pt-2">
      <p className="text-[11px] font-semibold text-muted-foreground">
        Covers:
      </p>
      <ul className="space-y-0.5">
        {previousWeekLessons.map((coveredLesson) => (
          <li
            key={coveredLesson.id}
            className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground"
          >
            <span aria-hidden="true" className="shrink-0">•</span>
            <span className="line-clamp-1">{coveredLesson.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  const contentTypes = isWeeklyExam ? examCovers : regularContentTypes

  // Unlocked → real link to the lesson. In preview mode the link points to
  // Landing's /preview/lesson/:id; otherwise the same-origin lesson route.
  if (unlocked) {
    const unlockedTo = previewMode ? ROUTES.PREVIEW_LESSON(lesson.id) : ROUTES.LESSON(lesson.id)
    return (
      <Link
        to={unlockedTo}
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

  // Sequentially locked for active Standard users → disabled curriculum card.
  // This is intentionally separate from the subscription lock below.
  if (sequenceLocked) {
    return (
      <div
        className={cn(
          cardBase,
          'bg-card/45 border-dashed opacity-70 cursor-not-allowed',
        )}
        aria-disabled="true"
      >
        {header}
        {title}
        {contentTypes}
        <p className="text-[11px] font-semibold text-muted-foreground mt-1">
          Complete previous lesson to unlock
        </p>
      </div>
    )
  }

  // Locked → route to enrollment. In preview mode we always land on Landing,
  // so the target lives on a different origin (portal /register); use a
  // full-page <a href> via getAbsoluteUrl so the cross-origin hop is correct.
  if (previewMode) {
    return (
      <a
        href={getAbsoluteUrl(ROUTES.REGISTER)}
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
      </a>
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

function getWatchStatusBadge({
  isWatched,
  isExam,
}: {
  isWatched: boolean
  isExam: boolean
}) {
  if (isWatched) {
    return (
      <Badge variant="success" className="px-2 py-0 text-[10px]">
        Completed
      </Badge>
    )
  }

  return (
    <Badge variant={isExam ? 'pro' : 'secondary'} className="px-2 py-0 text-[10px]">
      {isExam ? 'Ready' : 'Not Started'}
    </Badge>
  )
}
