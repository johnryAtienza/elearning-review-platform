import { Link } from 'react-router-dom'
import { Clock, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Course } from '../types'

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      to={`/course/${course.id}`}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className={`relative h-44 bg-linear-to-br ${course.thumbnail}`}>
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-black/25 text-white border-0 backdrop-blur-sm text-xs">
            {course.category}
          </Badge>
        </div>
      </div>

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
