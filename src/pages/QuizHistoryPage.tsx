import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuizHistoryStore } from '@/store/quizHistoryStore'
import { ROUTES } from '@/constants/routes'
import type { QuizAttempt } from '@/services/quizResultsApi'

export function QuizHistoryPage() {
  const { attempts, loading, initialized, fetch } = useQuizHistoryStore()

  useEffect(() => {
    fetch()
  }, [fetch])

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Quiz History</h1>
          <p className="text-sm text-muted-foreground">
            Every quiz you've submitted, newest first.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to={ROUTES.DASHBOARD}>
            <ChevronLeft className="size-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      {loading && !initialized ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <EmptyHistory />
      ) : (
        <ul className="space-y-3">
          {attempts.map((a) => (
            <AttemptRow key={a.id} attempt={a} />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Attempt row ───────────────────────────────────────────────────────────────

export function AttemptRow({ attempt }: { attempt: QuizAttempt }) {
  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0
  const date = new Date(attempt.submittedAt).toLocaleString(undefined, {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
    hour:  '2-digit',
    minute: '2-digit',
  })

  return (
    <li>
      <Link
        to={ROUTES.LESSON(attempt.lessonId)}
        className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
          <Award className="size-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold truncate">{attempt.lessonTitle}</p>
          <p className="text-xs text-muted-foreground truncate">
            {attempt.courseTitle} · {date}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">
            {attempt.score}<span className="text-muted-foreground font-normal">/{attempt.total}</span>
          </p>
          <p className="text-xs text-muted-foreground">{pct}%</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </Link>
    </li>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Award className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold">No quizzes taken yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Take a quiz at the end of any lesson and your results will land here.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-1">
        <Link to={ROUTES.COURSES}>Browse subjects</Link>
      </Button>
    </div>
  )
}
