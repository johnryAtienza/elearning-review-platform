/**
 * LessonCTAs
 *
 * Step-based action area rendered below the video player.
 *
 * Phase 1 — Not yet watched:
 *   Shows a video progress track and a "Mark as Watched" button.
 *   Button is disabled until videoProgress ≥ 95%.
 *   No auto-marking — the user must click explicitly.
 *
 * Phase 2 — Watched:
 *   Replaces the button with a ✓ Watched badge and a segmented tab
 *   control (Reviewer | Quiz). Clicking a tab switches the visible
 *   content panel; only one panel is ever shown at a time.
 */

import { Check, CheckCircle2, BookOpen, ClipboardList, Loader2 } from 'lucide-react'
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

  /** Whether this lesson has reviewer content (text or PDF) */
  hasReviewer: boolean
  /** Whether this lesson has a quiz */
  hasQuiz: boolean

  /** Currently visible tab — null means no panel is open (shouldn't happen in Phase 2) */
  activeTab: 'reviewer' | 'quiz' | null
  /** Called when the user clicks a tab button */
  onTabChange: (tab: 'reviewer' | 'quiz') => void
}

const WATCH_THRESHOLD = 95

export function LessonCTAs({
  videoProgress,
  isWatched,
  markingWatched,
  onMarkWatched,
  hasReviewer,
  hasQuiz,
  activeTab,
  onTabChange,
}: LessonCTAsProps) {
  const clampedProgress = Math.min(videoProgress, 100)
  const canMarkWatched  = clampedProgress >= WATCH_THRESHOLD

  // ── Phase 2: Watched ─────────────────────────────────────────────────────────
  if (isWatched) {
    return (
      <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-bottom-1 duration-300">
        {/* Watched badge */}
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold shrink-0">
          <CheckCircle2 className="size-4" />
          Watched
        </div>

        {/* Only render the tab control if there's at least one tab to show */}
        {(hasReviewer || hasQuiz) && (
          <>
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Segmented tab control */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-1">
              {hasReviewer && (
                <TabButton
                  active={activeTab === 'reviewer'}
                  onClick={() => onTabChange('reviewer')}
                  icon={<BookOpen className="size-3.5" />}
                  label="Reviewer"
                />
              )}
              {hasQuiz && (
                <TabButton
                  active={activeTab === 'quiz'}
                  onClick={() => onTabChange('quiz')}
                  icon={<ClipboardList className="size-3.5" />}
                  label="Quiz"
                />
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Phase 1: Not yet watched ─────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
      {/* Video progress track */}
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        <div className="relative flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
              canMarkWatched ? 'bg-green-500' : 'bg-primary',
            )}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-8 text-right">
          {clampedProgress}%
        </span>
      </div>

      {/* Mark as Watched */}
      <Tooltip
        label={
          canMarkWatched
            ? 'Click to mark this lesson as complete'
            : `Watch at least ${WATCH_THRESHOLD}% to enable (${clampedProgress}% watched)`
        }
      >
        <Button
          size="sm"
          disabled={!canMarkWatched || markingWatched}
          onClick={onMarkWatched}
          className="gap-2 shrink-0"
        >
          {markingWatched ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className={cn('size-4', !canMarkWatched && 'opacity-40')} />
          )}
          {markingWatched ? 'Saving…' : 'Mark as Watched'}
        </Button>
      </Tooltip>
    </div>
  )
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-background shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Wraps any child in a hover tooltip. Uses a div wrapper so pointer events
// are captured even when the child button is disabled.

function Tooltip({ label, children }: { label?: string; children: React.ReactNode }) {
  if (!label) return <>{children}</>

  return (
    <div className="relative group/tip inline-flex">
      <div className="pointer-events-auto">{children}</div>
      <span
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
          'w-64 text-center rounded-md border bg-popover',
          'text-popover-foreground text-xs px-2.5 py-1.5 shadow-md leading-snug',
          'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50',
        )}
      >
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </div>
  )
}
