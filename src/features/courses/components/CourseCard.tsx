import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, BookOpen, Bookmark, BookmarkCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { useSavedCoursesStore } from '@/store/savedCoursesStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'
import type { Course } from '../types'

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isSaved  = useSavedCoursesStore((s) => s.isSaved(course.id))
  const toggle   = useSavedCoursesStore((s) => s.toggle)
  const [saving, setSaving] = useState(false)

  async function handleToggleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return
    setSaving(true)
    try {
      await toggle(course.id)
    } finally {
      setSaving(false)
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
        className="h-44"
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-black/25 text-white border-0 backdrop-blur-sm text-xs">
            {course.category}
          </Badge>
        </div>

        {/* Save button — authenticated non-admin users only */}
        {isAuthenticated && !isAdmin && (
          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-label={isSaved ? 'Remove from dashboard' : 'Save to dashboard'}
            className={cn(
              'absolute top-2.5 right-2.5 flex size-8 items-center justify-center',
              'rounded-full backdrop-blur-sm transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
              isSaved
                ? 'bg-primary text-white hover:bg-primary/80'
                : 'bg-black/30 text-white hover:bg-black/50',
              saving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaved
              ? <BookmarkCheck className="size-4" />
              : <Bookmark className="size-4" />
            }
          </button>
        )}
      </CourseThumbnail>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <h3 className="font-semibold text-[0.9375rem] leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {course.description}
        </p>

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
