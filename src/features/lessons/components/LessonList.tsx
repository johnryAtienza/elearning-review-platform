import { Link } from 'react-router-dom'
import { Lock, PlayCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Lesson } from '../types'

interface LessonListProps {
  lessons: Lesson[]
  isSubscribed: boolean
  activeLessonId?: string
}

export function LessonList({ lessons, isSubscribed, activeLessonId }: LessonListProps) {
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
                : isSubscribed
                ? 'hover:bg-muted/60 text-foreground'
                : 'text-muted-foreground cursor-default',
            )}
          >
            {/* Order number */}
            <span className={cn('w-5 shrink-0 text-right tabular-nums text-xs', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {lesson.order}
            </span>

            {/* Title */}
            <span className="flex-1 min-w-0 truncate font-medium">{lesson.title}</span>

            {/* Duration */}
            <span className="text-xs text-muted-foreground shrink-0">{lesson.duration}</span>

            {/* Icon */}
            {isSubscribed ? (
              isActive ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
              )
            ) : (
              <Lock className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
        )

        if (!isSubscribed) return <li key={lesson.id}>{inner}</li>

        return (
          <li key={lesson.id}>
            <Link to={`/lesson/${lesson.id}`}>{inner}</Link>
          </li>
        )
      })}
    </ol>
  )
}
