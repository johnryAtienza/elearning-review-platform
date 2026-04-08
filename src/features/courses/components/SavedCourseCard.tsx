import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, BookOpen, Bookmark, BookmarkCheck, CheckCircle2, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { useSavedCoursesStore } from '@/store/savedCoursesStore'
import { cn } from '@/utils/cn'
import type { Course } from '../types'

interface SavedCourseCardProps {
  course:         Course
  watchedLessons: number
  totalLessons:   number
}

export function SavedCourseCard({ course, watchedLessons, totalLessons }: SavedCourseCardProps) {
  const remove  = useSavedCoursesStore((s) => s.remove)
  const [removing, setRemoving] = useState(false)

  const pct       = totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0
  const completed = pct === 100
  const started   = watchedLessons > 0

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (removing) return
    setRemoving(true)
    try {
      await remove(course.id)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Link
      to={`/course/${course.id}`}
      className="group relative flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Thumbnail */}
      <CourseThumbnail
        src={course.thumbnailUrl}
        alt={course.title}
        gradient={course.thumbnail}
        className="h-40"
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />

        {/* Category badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-black/25 text-white border-0 backdrop-blur-sm text-xs">
            {course.category}
          </Badge>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          {completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <CheckCircle2 className="size-3" />
              Completed
            </span>
          ) : started ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
              <PlayCircle className="size-3" />
              In Progress
            </span>
          ) : null}
        </div>

        {/* Unsave button */}
        <button
          onClick={handleRemove}
          disabled={removing}
          aria-label="Remove from dashboard"
          className={cn(
            'absolute top-2.5 right-2.5 flex size-8 items-center justify-center',
            'rounded-full bg-primary text-white backdrop-blur-sm',
            'hover:bg-primary/80 transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
            removing && 'opacity-60 cursor-not-allowed',
          )}
        >
          {removing
            ? <Bookmark className="size-4 opacity-60" />
            : <BookmarkCheck className="size-4" />
          }
        </button>
      </CourseThumbnail>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-300',
            completed ? 'bg-green-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <h3 className="font-semibold text-[0.9375rem] leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>

        {/* Progress text + bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{watchedLessons} / {totalLessons} lessons watched</span>
            {totalLessons > 0 && (
              <span className={cn('font-semibold tabular-nums', completed ? 'text-green-600' : 'text-primary')}>
                {pct}%
              </span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completed ? 'bg-green-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t">
          <span className="flex items-center gap-1 pt-2.5">
            <BookOpen className="size-3.5" />
            {course.lessons} lessons
          </span>
          <span className="flex items-center gap-1 pt-2.5">
            <Clock className="size-3.5" />
            {course.duration}
          </span>
        </div>
      </div>
    </Link>
  )
}
