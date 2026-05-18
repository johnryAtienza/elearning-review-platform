import { Link } from 'react-router-dom'
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'
import type { Lesson } from '../types'

interface LessonListProps {
  lessons: Lesson[]
  isSubscribed: boolean
  isAdmin?: boolean
  activeLessonId?: string
  /** When true the list is shown to a guest (unauthenticated). Lessons are non-clickable. */
  isGuest?: boolean
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function LessonList({ lessons, isSubscribed, isAdmin = false, activeLessonId, isGuest = false }: LessonListProps) {
  return (
    <ol className="space-y-1">
      {lessons.map((lesson) => {
        const isActive = lesson.id === activeLessonId
        const isDayOne = lesson.dayNumber === 1
        // Day 1 is free for any authenticated (non-guest) user. Day 2+ needs a sub.
        const unlocked = isSubscribed || isAdmin || (isDayOne && !isGuest)

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
                <span className="text-xs text-muted-foreground shrink-0">Sign in</span>
              ) : (
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Upgrade to unlock" />
              )
            ) : isDayOne && !isSubscribed && !isAdmin ? (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning shrink-0">
                Free
              </span>
            ) : (
              <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        )

        // Guests (unauthenticated) can't enter lessons
        if (isGuest) return <li key={lesson.id}>{inner}</li>

        // Locked Day 2+ on free tier → route to upgrade page instead of lesson
        const to = unlocked ? ROUTES.LESSON(lesson.id) : ROUTES.SUBSCRIPTION

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
