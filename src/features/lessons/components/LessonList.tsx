import { Link } from 'react-router-dom'
import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Lesson } from '../types'

interface LessonListProps {
  lessons: Lesson[]
  isSubscribed: boolean
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

export function LessonList({ lessons, isSubscribed, activeLessonId, isGuest = false }: LessonListProps) {
  return (
    <ol className="space-y-1">
      {lessons.map((lesson) => {
        const isActive = lesson.id === activeLessonId

        const inner = (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : isGuest
                ? 'text-muted-foreground cursor-default'
                : 'hover:bg-muted/60 text-foreground',
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
            ) : isSubscribed ? (
              <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
            ) : isGuest ? (
              <span className="text-xs text-muted-foreground shrink-0">Sign in</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                Free
              </span>
            )}
          </div>
        )

        // Guests (unauthenticated) can't enter lessons
        if (isGuest) return <li key={lesson.id}>{inner}</li>

        return (
          <li key={lesson.id}>
            <Link to={`/lesson/${lesson.id}`}>{inner}</Link>
          </li>
        )
      })}
    </ol>
  )
}
