import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResultSummary } from '@/features/quiz/components/ResultSummary'
import { ROUTES } from '@/constants/routes'
import { quizApi } from '@s-class/api/quizApi'
import { getQuizAttempt, type QuizAttemptDetail } from '@s-class/api/quizResultsApi'
import type { ProblemSet, QuizQuestion } from '@s-class/types/quiz'

type ReviewState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; attempt: QuizAttemptDetail; problemSets: ProblemSet[] }

export function QuizResultReviewPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<ReviewState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadReview() {
      if (!attemptId) {
        setState({ status: 'not-found' })
        return
      }

      setState({ status: 'loading' })

      try {
        const attempt = await getQuizAttempt(attemptId)
        if (!attempt) {
          if (!cancelled) setState({ status: 'not-found' })
          return
        }

        const problemSets = await quizApi.getProblemSetsByLesson(attempt.lessonId)
        if (!cancelled) setState({ status: 'ready', attempt, problemSets })
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load quiz result.',
          })
        }
      }
    }

    void loadReview()

    return () => {
      cancelled = true
    }
  }, [attemptId])

  if (state.status === 'loading') {
    return (
      <ReviewShell>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </ReviewShell>
    )
  }

  if (state.status === 'not-found') {
    return (
      <ReviewShell>
        <EmptyMessage
          title="Quiz result not found"
          body="This quiz result may have been removed, or it may not belong to the current account."
        />
      </ReviewShell>
    )
  }

  if (state.status === 'error') {
    return (
      <ReviewShell>
        <EmptyMessage title="Unable to load quiz result" body={state.message} />
      </ReviewShell>
    )
  }

  return (
    <ReviewShell attempt={state.attempt}>
      <AttemptReview
        attempt={state.attempt}
        problemSets={state.problemSets}
        onRetry={() => navigate(ROUTES.LESSON(state.attempt.lessonId))}
      />
    </ReviewShell>
  )
}

function AttemptReview({
  attempt,
  problemSets,
  onRetry,
}: {
  attempt: QuizAttemptDetail
  problemSets: ProblemSet[]
  onRetry: () => void
}) {
  const questions = useMemo(
    () => findAttemptQuestions(problemSets, attempt.quizId, attempt.answers),
    [problemSets, attempt.quizId, attempt.answers],
  )

  const result = useMemo(() => {
    const correct = new Set<string>()
    const wrong = new Set<string>()

    for (const question of questions) {
      const selected = attempt.answers[question.id]
      if (selected === question.correctAnswer) correct.add(question.id)
      else wrong.add(question.id)
    }

    return {
      score: attempt.score,
      total: attempt.total,
      correct,
      wrong,
    }
  }, [attempt.answers, attempt.score, attempt.total, questions])

  if (questions.length === 0) {
    return (
      <EmptyMessage
        title="Review unavailable"
        body="The saved attempt loaded, but its original questions could not be matched to the current problem sets."
      />
    )
  }

  return (
    <ResultSummary
      questions={questions}
      answers={attempt.answers}
      result={result}
      onRetry={onRetry}
    />
  )
}

function findAttemptQuestions(
  problemSets: ProblemSet[],
  quizId: string | null,
  answers: Record<string, number>,
): QuizQuestion[] {
  if (quizId) {
    const matchingSet = problemSets.find((set) => set.id === quizId)
    if (matchingSet) return matchingSet.questions
  }

  const answeredIds = new Set(Object.keys(answers))
  const matchingSet = problemSets.find((set) =>
    set.questions.some((question) => answeredIds.has(question.id)),
  )

  return matchingSet?.questions ?? []
}

function ReviewShell({
  attempt,
  children,
}: {
  attempt?: QuizAttemptDetail
  children: ReactNode
}) {
  const date = attempt
    ? new Date(attempt.submittedAt).toLocaleString(undefined, {
        year:   'numeric',
        month:  'short',
        day:    'numeric',
        hour:   '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Quiz review
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {attempt?.lessonTitle ?? 'Submitted quiz result'}
          </h1>
          {attempt && (
            <p className="text-sm text-muted-foreground">
              {attempt.courseTitle} / {date}
            </p>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="self-start gap-1.5">
          <Link to={ROUTES.QUIZ_HISTORY}>
            <ChevronLeft className="size-4" />
            Quiz results
          </Link>
        </Button>
      </div>

      {children}
    </div>
  )
}

function EmptyMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Award className="size-7 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-1">
        <Link to={ROUTES.QUIZ_HISTORY}>Back to quiz results</Link>
      </Button>
    </div>
  )
}
