/**
 * LessonCTAs
 *
 * Action bar rendered below the video player with three CTAs:
 *   1. Mark as Watched  — disabled until videoProgress ≥ 95%
 *   2. View Reviewer    — disabled until isWatched
 *   3. Take Quiz        — disabled until isWatched
 *
 * For free-tier users the Reviewer/Quiz sections are always rendered
 * inline below (with tier-appropriate limits/locks). The CTA buttons
 * simply scroll to those sections when the lesson has been watched.
 */

import { Check, BookOpen, ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface LessonCTAsProps {
  /** 0–100 watch progress reported by VideoPlayer */
  videoProgress: number
  /** Whether the user has explicitly marked this lesson as watched */
  isWatched: boolean
  /** True while the markWatched network request is in-flight */
  markingWatched: boolean
  onMarkWatched: () => void

  /** Pass false to hide the Reviewer button (no reviewer content) */
  hasReviewer: boolean
  onViewReviewer: () => void

  /** Pass false to hide the Quiz button (no quiz for this lesson) */
  hasQuiz: boolean
  onTakeQuiz: () => void
}

const WATCH_THRESHOLD = 95

export function LessonCTAs({
  videoProgress,
  isWatched,
  markingWatched,
  onMarkWatched,
  hasReviewer,
  onViewReviewer,
  hasQuiz,
  onTakeQuiz,
}: LessonCTAsProps) {
  const canMarkWatched = videoProgress >= WATCH_THRESHOLD
  const progressLabel  = `${Math.min(videoProgress, 100)}%`

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* ── Mark as Watched ── */}
      <Tooltip
        label={
          isWatched
            ? undefined
            : canMarkWatched
              ? 'Click to mark this lesson as complete'
              : `Watch at least ${WATCH_THRESHOLD}% of the video to mark as watched (${progressLabel} watched)`
        }
      >
        <Button
          variant={isWatched ? 'outline' : 'default'}
          size="sm"
          disabled={isWatched || markingWatched || !canMarkWatched}
          onClick={onMarkWatched}
          className={cn(
            'gap-2 transition-all',
            isWatched && 'border-green-500/40 text-green-600 dark:text-green-400',
          )}
        >
          {markingWatched ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isWatched ? (
            <Check className="size-4" />
          ) : (
            <Check className="size-4 opacity-50" />
          )}
          {isWatched ? 'Watched' : 'Mark as Watched'}
        </Button>
      </Tooltip>

      {/* ── View Reviewer ── */}
      {hasReviewer && (
        <Tooltip
          label={
            isWatched
              ? undefined
              : 'Finish the video first to unlock the reviewer'
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!isWatched}
            onClick={onViewReviewer}
            className="gap-2"
          >
            <BookOpen className="size-4" />
            View Reviewer
          </Button>
        </Tooltip>
      )}

      {/* ── Take Quiz ── */}
      {hasQuiz && (
        <Tooltip
          label={
            isWatched
              ? undefined
              : 'Complete the video to unlock the quiz'
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!isWatched}
            onClick={onTakeQuiz}
            className="gap-2"
          >
            <ClipboardList className="size-4" />
            Take Quiz
          </Button>
        </Tooltip>
      )}
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Wraps any child in a hover tooltip. Uses a div wrapper so pointer events
// are captured even when the child button is disabled (pointer-events-none).

function Tooltip({ label, children }: { label?: string; children: React.ReactNode }) {
  if (!label) return <>{children}</>

  return (
    <div className="relative group/tip inline-flex">
      {/* pointer-events-auto ensures hover fires even over a disabled button */}
      <div className="pointer-events-auto">{children}</div>

      <span
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
          'w-56 text-center rounded-md border bg-popover',
          'text-popover-foreground text-xs px-2.5 py-1.5 shadow-md leading-snug',
          'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50',
        )}
      >
        {label}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </div>
  )
}
