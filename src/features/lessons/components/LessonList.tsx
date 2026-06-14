import { Link } from 'react-router-dom'
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import type { Lesson } from '../types'

interface LessonListProps {
  lessons: Lesson[]
  isSubscribed: boolean
  isAdmin?: boolean
  activeLessonId?: string
  /** When true the list is shown to a guest (unauthenticated). Lessons are non-clickable. */
  isGuest?: boolean
  /**
   * Public preview funnel on Landing. Unlocked lessons route to
   * /preview/lesson/:id; locked lessons link to /register.
   */
  previewMode?: boolean
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function LessonList({ lessons, isSubscribed, isAdmin = false, activeLessonId, isGuest = false, previewMode = false }: LessonListProps) {
  return (
    <ol className="space-y-1">
      {lessons.map((lesson) => {
        const isActive  = lesson.id === activeLessonId
        const isPreview = lesson.isFreePreview === true
        // Free-preview lessons unlock for everyone (guests too); premium
        // lessons require a subscription or admin role. In Landing's preview
        // funnel only flagged previews are unlocked — subscribed/admin paths
        // never reach this code path (they're authenticated → portal).
        const unlocked  = previewMode ? isPreview : (isSubscribed || isAdmin || isPreview)

        const inner = (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : isGuest
                ? 'text-muted-foreground cursor-default'
                : unlocked
                ? 'hover:bg-muted/60 text-foreground'
                : 'hover:bg-muted/40 text-muted-foreground',
            )}
          >
            {/* Order number */}
            <span className={cn('w-5 shrink-0 text-right tabular-nums text-xs', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {lesson.order}
            </span>

            {/* Title */}
            <span className="flex-1 min-w-0 truncate font-medium">{lesson.title}</span>

            {/* Duration */}
            {(lesson.durationMinutes != null || lesson.duration) && (
              <span className="text-xs text-muted-foreground shrink-0">
                {lesson.durationMinutes != null ? formatDuration(lesson.durationMinutes) : lesson.duration}
              </span>
            )}

            {/* Right-side indicator */}
            {isActive ? (
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
            ) : !unlocked ? (
              isGuest ? (
                <span className="text-xs text-muted-foreground shrink-0">Enroll</span>
              ) : (
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Enroll to unlock" />
              )
            ) : isPreview && !isSubscribed && !isAdmin ? (
              <span className="inline-flex items-center rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success shrink-0">
                Free Preview
              </span>
            ) : (
              <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        )

        // Locked premium lesson → route to enrollment instead of the lesson.
        // Guests on a locked lesson hit /register; authenticated free users
        // hit /portal/subscription. Preview lessons stay reachable directly.
        // In preview mode, locked lessons link to /register and unlocked links
        // route to Landing's /preview/lesson/:id.
        if (previewMode) {
          if (unlocked) {
            return (
              <li key={lesson.id}>
                <Link to={ROUTES.PREVIEW_LESSON(lesson.id)} aria-label={lesson.title}>
                  {inner}
                </Link>
              </li>
            )
          }
          return (
            <li key={lesson.id}>
              <a
                href={getAbsoluteUrl(ROUTES.REGISTER)}
                aria-label={`${lesson.title} — Enroll to unlock`}
              >
                {inner}
              </a>
            </li>
          )
        }

        const lockedTarget = isGuest ? ROUTES.REGISTER : ROUTES.SUBSCRIPTION
        const to = unlocked ? ROUTES.LESSON(lesson.id) : lockedTarget

        return (
          <li key={lesson.id}>
            <Link to={to} aria-label={unlocked ? lesson.title : `${lesson.title} — upgrade to unlock`}>
              {inner}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
