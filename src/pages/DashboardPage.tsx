import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Zap, Award, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogoutModal } from '@/components/LogoutModal'
import { useAuthStore } from '@/store/authStore'
import { useCourses } from '@/features/courses/hooks/useCourses'

export function DashboardPage() {
  const { user, isSubscribed, logout } = useAuthStore()
  const { courses } = useCourses()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => { setShowLogoutModal(false); logout() }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
          {initials}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <Badge variant={isSubscribed ? 'pro' : 'outline'}>
              {isSubscribed ? 'Pro' : 'Free'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLogoutModal(true)} className="shrink-0">
          Log out
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, label: 'Courses Available', value: courses.length },
          { icon: Zap,      label: 'Total Lessons',     value: 51 },
          { icon: Award,    label: 'Quiz Questions',    value: 204 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription CTA */}
      {!isSubscribed && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold">Unlock full access</p>
            <p className="text-sm text-muted-foreground">
              Subscribe to Pro to access all lessons, quizzes, and reviewer content.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/subscription">View Plans</Link>
          </Button>
        </div>
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Links
        </h2>
        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {[
            { to: '/courses',      label: 'Browse all courses',    sub: `${courses.length} courses available` },
            { to: '/subscription', label: 'Subscription & billing', sub: isSubscribed ? 'Pro plan — active' : 'Free plan' },
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
      </div>
    </div>
  )
}
