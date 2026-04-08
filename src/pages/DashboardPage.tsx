import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Zap, Award, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoutModal } from '@/components/LogoutModal'
import { SavedCourseCard } from '@/features/courses/components/SavedCourseCard'
import { useAuthStore } from '@/store/authStore'
import { useSavedCoursesStore } from '@/store/savedCoursesStore'
import { useCourses } from '@/features/courses/hooks/useCourses'

export function DashboardPage() {
  const { user, isSubscribed, logout } = useAuthStore()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const { savedIds, progressMap, stats, loading, fetch } = useSavedCoursesStore()
  const { courses } = useCourses()

  // Load saved courses + stats on mount
  useEffect(() => {
    fetch()
  }, [fetch])

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  // Merge saved IDs with full course data
  const savedCourses = useMemo(
    () =>
      savedIds
        .map((id) => courses.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c !== undefined),
    [savedIds, courses],
  )

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => { setShowLogoutModal(false); logout() }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* ── Profile card ── */}
      <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
          {initials}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <Badge variant={isSubscribed ? 'pro' : 'outline'}>
              {isSubscribed ? 'Standard' : 'Free'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLogoutModal(true)} className="shrink-0">
          Log out
        </Button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Courses Saved"
          value={stats.coursesSaved}
          loading={loading}
          accent="blue"
        />
        <StatCard
          icon={Zap}
          label="Lessons Completed"
          value={stats.lessonsCompleted}
          loading={loading}
          accent="purple"
        />
        <StatCard
          icon={Award}
          label="Quizzes Taken"
          value={stats.quizzesTaken}
          loading={loading}
          accent="amber"
        />
      </div>

      {/* ── Subscription CTA ── */}
      {!isSubscribed && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold">Unlock full access</p>
            <p className="text-sm text-muted-foreground">
              Subscribe to Standard to access all lessons, quizzes, and reviewer content.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/subscription">View Plans</Link>
          </Button>
        </div>
      )}

      {/* ── My Courses ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              My Courses
            </h2>
            {savedCourses.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {savedCourses.length}
              </span>
            )}
            <div className="h-px flex-1 bg-border w-12" />
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Link to="/courses">
              <Plus className="size-3.5" />
              Add courses
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SavedCourseCardSkeleton key={i} />
            ))}
          </div>
        ) : savedCourses.length === 0 ? (
          <EmptyCourses />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedCourses.map((course) => {
              const progress = progressMap[course.id]
              return (
                <SavedCourseCard
                  key={course.id}
                  course={course}
                  watchedLessons={progress?.watchedLessons ?? 0}
                  totalLessons={progress?.totalLessons ?? course.lessons}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Quick links ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Links
        </h2>
        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {[
            { to: '/courses',      label: 'Browse all courses',     sub: `${courses.length} courses available` },
            { to: '/subscription', label: 'Subscription & billing', sub: isSubscribed ? 'Standard plan — active' : 'Free plan' },
          ].map(({ to, label, sub }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  amber:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

function StatCard({
  icon: Icon, label, value, loading, accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  loading: boolean
  accent: keyof typeof ACCENT_CLASSES
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className={`flex size-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-7 w-12 mb-1" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyCourses() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <BookOpen className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold">No courses saved yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Browse courses and click the bookmark icon to add them here.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-1 gap-1.5">
        <Link to="/courses">
          <Plus className="size-3.5" />
          Browse courses
        </Link>
      </Button>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SavedCourseCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Skeleton className="h-40 rounded-none" />
      <div className="h-1.5 w-full bg-muted" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-4 pt-2 border-t">
          <Skeleton className="h-3 w-20 mt-2" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      </div>
    </div>
  )
}
