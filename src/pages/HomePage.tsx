import { Link } from 'react-router-dom'
import { BookOpen, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseList } from '@/features/courses/components/CourseList'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useCourses } from '@/features/courses/hooks/useCourses'
import { useAuthStore } from '@/store/authStore'

const STATS = [
  { icon: BookOpen, label: 'Expert Courses', value: '6+' },
  { icon: Users, label: 'Active Learners', value: '1,200+' },
  { icon: Star, label: 'Avg. Rating', value: '4.8' },
]

export function HomePage() {
  const { courses, loading, error } = useCourses()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-linear-to-br from-primary/5 via-background to-accent/20">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 rounded-full bg-primary" />
            New courses added every month
          </span>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Master modern{' '}
            <span className="text-primary">frontend development</span>
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Expert-led courses on React, TypeScript, and the modern frontend stack.
            Learn at your own pace with interactive lessons and quizzes.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-7 text-base">
              <Link to="/register">Start Learning Free</Link>
            </Button>
            {!isAuthenticated && (
              <Button variant="outline" asChild size="lg" className="h-11 px-7 text-base">
                <Link to="/login">Log in</Link>
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-8 border-t pt-8 w-full max-w-lg">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="size-4 text-primary" />
                  <span className="text-2xl font-bold">{value}</span>
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course listing */}
      <section className="container mx-auto px-4 py-14 space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">All Courses</h2>
            <p className="text-sm text-muted-foreground">{courses.length} courses available</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/courses">View all →</Link>
          </Button>
        </div>
        {error
          ? <ErrorMessage message={error} />
          : <CourseList courses={courses} loading={loading} />
        }
      </section>
    </div>
  )
}
