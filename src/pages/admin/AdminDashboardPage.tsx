import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, BookMarked, Users, CreditCard, ArrowRight, TrendingUp, GraduationCap, CheckCircle2 } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import { getAdminStats, type AdminStats } from '@/services/admin.service'
import { ROUTES } from '@/constants/routes'
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton'

export function AdminDashboardPage() {
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminStats()
      .then((s) => { if (!cancelled) { setStats(s); setLoading(false) } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stats.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  if (loading && !error) return <AdminDashboardSkeleton />

  return (
    <div className="space-y-8">

      {/* ── Page heading ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Stats grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers}
          icon={Users}
          sub={
            stats
              ? `${stats.activeSubscriptions} Standard · ${stats.totalUsers - stats.activeSubscriptions} Free`
              : undefined
          }
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="All registered accounts, including admins. Split into Standard (paid) and Free below."
        />
        <StatCard
          label="Total Courses"
          value={stats?.totalCourses}
          icon={BookOpen}
          sub={
            stats
              ? `${stats.publishedCourses} published · ${stats.totalCourses - stats.publishedCourses} drafts`
              : undefined
          }
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="All courses in the catalog. Published courses are visible to students; drafts are admin-only."
        />
        <StatCard
          label="Total Lessons"
          value={stats?.totalLessons}
          icon={BookMarked}
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="Total number of lessons across every course, published or draft."
        />
        <StatCard
          label="Active Subscriptions"
          value={stats?.activeSubscriptions}
          icon={CreditCard}
          sub={
            stats
              ? `${Math.round((stats.activeSubscriptions / Math.max(stats.totalUsers, 1)) * 100)}% conversion rate`
              : undefined
          }
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="Users with a currently active paid subscription. Conversion rate = active subs ÷ total users."
        />
        <StatCard
          label="Students Who Finished a Lesson"
          value={stats?.studentsCompletedLesson}
          icon={GraduationCap}
          sub={
            stats
              ? `${Math.round((stats.studentsCompletedLesson / Math.max(stats.totalUsers, 1)) * 100)}% of users`
              : undefined
          }
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="Unique students (counted once each) who have marked at least one lesson as watched."
        />
        <StatCard
          label="Lessons Completed"
          value={stats?.totalLessonsCompleted}
          icon={CheckCircle2}
          sub={
            stats && stats.studentsCompletedLesson > 0
              ? `${(stats.totalLessonsCompleted / stats.studentsCompletedLesson).toFixed(1)} avg per student`
              : undefined
          }
          loading={loading}
          iconColor="text-primary"
          iconBg="bg-primary/15"
          tooltip="Total lesson-completion events across all users. If one student finishes 3 lessons, that counts as 3 here."
        />
      </div>

      {/* ── Quick links ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            to={ROUTES.ADMIN_COURSES}
            label="Manage Courses"
            description="Publish, unpublish, and review all courses."
            icon={BookOpen}
          />
          <QuickLink
            to={ROUTES.ADMIN_LESSONS}
            label="Manage Lessons"
            description="View and edit lessons across all courses."
            icon={BookMarked}
          />
          <QuickLink
            to={ROUTES.ADMIN_USERS}
            label="Manage Users"
            description="View all registered users and their roles."
            icon={Users}
          />
          <QuickLink
            to={ROUTES.ADMIN_SUBSCRIPTIONS}
            label="Subscriptions"
            description="Monitor active Pro subscriptions."
            icon={CreditCard}
          />
          <QuickLink
            to={ROUTES.ADMIN_QUIZZES}
            label="Quizzes"
            description="Review and manage quizzes across lessons."
            icon={TrendingUp}
          />
        </div>
      </div>

    </div>
  )
}

// ── QuickLink ─────────────────────────────────────────────────────────────────

function QuickLink({
  to,
  label,
  description,
  icon: Icon,
}: {
  to: string
  label: string
  description: string
  icon: React.ElementType
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
    </Link>
  )
}
