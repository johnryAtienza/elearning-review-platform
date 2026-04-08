import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseList } from '@/features/courses/components/CourseList'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useCourses } from '@/features/courses/hooks/useCourses'
import { useAuthStore } from '@/store/authStore'

// ── Stats config ──────────────────────────────────────────────────────────────

interface Stat {
  icon: typeof BookOpen
  label: string
  target: number
  decimals: number
  suffix: string
}

const STATS: Stat[] = [
  { icon: BookOpen, label: 'Expert Courses',  target: 6,    decimals: 0, suffix: '+' },
  { icon: Users,    label: 'Active Learners', target: 1200, decimals: 0, suffix: '+' },
  { icon: Star,     label: 'Avg. Rating',     target: 4.8,  decimals: 1, suffix: '' },
]

// ── useCountUp ────────────────────────────────────────────────────────────────

function useCountUp(target: number, decimals: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const step = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(parseFloat((eased * target).toFixed(decimals)))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, decimals, duration])

  return { ref, value }
}

// ── StatItem ──────────────────────────────────────────────────────────────────

function StatItem({ stat, delay }: { stat: Stat; delay: number }) {
  const { ref, value } = useCountUp(stat.target, stat.decimals)

  const display =
    stat.target >= 1000
      ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : value.toFixed(stat.decimals)

  return (
    <div
      className="flex flex-col items-center gap-1 opacity-0"
      style={{ animation: `heroFadeUp 0.6s ease forwards`, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1.5">
        <stat.icon className="size-4 text-primary" />
        <span ref={ref} className="text-2xl font-bold tabular-nums">
          {display}{stat.suffix}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{stat.label}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { courses, loading, error } = useCourses()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div>
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-linear-to-br from-primary/5 via-background to-accent/20">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">

          {/* Badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm opacity-0"
            style={{ animation: 'heroFadeUp 0.6s ease forwards', animationDelay: '0ms' }}
          >
            <span className="size-1.5 rounded-full bg-primary" />
            New courses added every month
          </span>

          {/* Headline */}
          <h1
            className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl opacity-0"
            style={{ animation: 'heroFadeUp 0.6s ease forwards', animationDelay: '120ms' }}
          >
            Master modern{' '}
            <span className="text-primary">frontend development</span>
          </h1>

          {/* Subtext */}
          <p
            className="max-w-xl text-base text-muted-foreground sm:text-lg opacity-0"
            style={{ animation: 'heroFadeUp 0.6s ease forwards', animationDelay: '240ms' }}
          >
            Expert-led courses on React, TypeScript, and the modern frontend stack.
            Learn at your own pace with interactive lessons and quizzes.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-wrap justify-center gap-3 opacity-0"
            style={{ animation: 'heroFadeUp 0.6s ease forwards', animationDelay: '360ms' }}
          >
            <Button asChild size="lg" className="h-11 px-7 text-base">
              <Link to="/register">Start Learning Free</Link>
            </Button>
            {!isAuthenticated && (
              <Button variant="outline" asChild size="lg" className="h-11 px-7 text-base">
                <Link to="/login">Log in</Link>
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap justify-center gap-8 border-t pt-8 w-full max-w-lg">
            {STATS.map((stat, i) => (
              <StatItem key={stat.label} stat={stat} delay={480 + i * 120} />
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
