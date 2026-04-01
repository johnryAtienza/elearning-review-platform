import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CourseList } from '@/features/courses/components/CourseList'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useCourses } from '@/features/courses/hooks/useCourses'
import { cn } from '@/utils/cn'

export function CoursesPage() {
  const isSubscribed = useAuthStore((s) => s.isSubscribed)
  const { courses, filtered, categories, loading, error, search, setSearch, category, setCategory } = useCourses()

  return (
    <div className="container mx-auto px-4 py-10 space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {courses.length} courses
            {!isSubscribed && ' — subscribe to unlock lessons'}
          </p>
        </div>
        {!isSubscribed && (
          <Button asChild size="sm">
            <Link to="/subscription">Upgrade to Pro</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                cat === category
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error
        ? <ErrorMessage message={error} />
        : <CourseList courses={filtered} loading={loading} />
      }
    </div>
  )
}
