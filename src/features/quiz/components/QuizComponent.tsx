import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { QuizQuestion } from '@/features/quiz/types'
import { useQuizStore } from '@/store/quizStore'
import { answerLabel } from '@/features/quiz/utils'
import { ResultSummary } from './ResultSummary'
import { ROUTES } from '@/constants/routes'

interface QuizComponentProps {
  questions: QuizQuestion[]
  visible: boolean
  /**
   * When true the quiz is locked (free tier).
   * Shows a blurred teaser + upgrade CTA instead of the real questions.
   */
  locked?: boolean
}

export function QuizComponent({ questions, visible, locked = false }: QuizComponentProps) {
  const { answers, submitted, result, setAnswer, submitQuiz, resetQuiz } = useQuizStore()

  const answeredCount = Object.keys(answers).length
  const allAnswered   = answeredCount === questions.length

  function handleSubmit() {
    if (!allAnswered) return
    submitQuiz(questions)
  }

  // Section header — always shown so the user knows a quiz exists
  const header = (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        Quiz
        {(!visible || locked) && <Lock className="size-3" />}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )

  // Subscribed user: video not yet complete → show "finish video" placeholder
  if (!visible && !locked) {
    return (
      <div className="space-y-5">
        {header}
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 flex flex-col items-center gap-3 text-center">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Quiz Locked</p>
            <p className="text-xs text-muted-foreground">
              Finish watching the video to unlock the quiz.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', visible && 'animate-in fade-in slide-in-from-bottom-2 duration-500')}>
      {header}

      {/* ── Locked state (free tier) ── */}
      {locked ? (
        <LockedQuiz questions={questions} />
      ) : submitted && result ? (
        <ResultSummary
          questions={questions}
          answers={answers}
          result={result}
          onRetry={resetQuiz}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Answer all {questions.length} questions, then submit to see your score.
          </p>

          <ol className="space-y-6">
            {questions.map((q, qi) => {
              const selected       = answers[q.id]
              const hasImageChoices = q.choices.some((c) => c.imageUrl)
              return (
                <li key={q.id} className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      <span className="mr-2 text-muted-foreground">{qi + 1}.</span>
                      {q.question}
                    </p>
                    {q.questionImageUrl && (
                      <img
                        src={q.questionImageUrl}
                        alt={`Question ${qi + 1}`}
                        className="rounded-lg border max-h-64 object-contain"
                      />
                    )}
                  </div>

                  <ul className={cn('gap-2', hasImageChoices ? 'grid grid-cols-2 sm:grid-cols-4' : 'space-y-2')}>
                    {q.choices.map((choice, ci) => {
                      const isSelected = selected === ci
                      return (
                        <li key={ci}>
                          <button
                            onClick={() => setAnswer(q.id, ci)}
                            className={cn(
                              'w-full rounded-lg border transition-colors',
                              hasImageChoices
                                ? 'flex flex-col items-center gap-2 p-2'
                                : 'flex items-center px-4 py-2.5 text-left text-sm',
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'bg-card hover:bg-muted/50 text-foreground',
                            )}
                          >
                            {choice.imageUrl ? (
                              <>
                                <img
                                  src={choice.imageUrl}
                                  alt={choice.text || `Option ${answerLabel(ci)}`}
                                  className="rounded object-contain max-h-28 w-full"
                                />
                                {choice.text && (
                                  <span className="text-xs font-medium">{choice.text}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm">
                                <span className="mr-2 font-medium text-muted-foreground">
                                  {answerLabel(ci)}.
                                </span>
                                {choice.text}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ol>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              {answeredCount} / {questions.length} answered
            </p>
            <Button onClick={handleSubmit} disabled={!allAnswered}>
              Submit Quiz
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Locked state (free tier) ──────────────────────────────────────────────────

function LockedQuiz({ questions }: { questions: QuizQuestion[] }) {
  // Show the first 2 questions blurred as a teaser
  const preview = questions.slice(0, 2)

  return (
    <div className="relative rounded-xl border overflow-hidden">
      {/* Blurred question teaser */}
      <div className="p-5 space-y-5 blur-sm select-none pointer-events-none opacity-60" aria-hidden>
        <p className="text-sm text-muted-foreground">
          Answer all {questions.length} questions, then submit to see your score.
        </p>
        <ol className="space-y-4">
          {preview.map((q, qi) => (
            <li key={q.id} className="space-y-2">
              <p className="font-medium text-sm">
                <span className="mr-2 text-muted-foreground">{qi + 1}.</span>
                {q.question}
              </p>
              <ul className="space-y-1.5">
                {q.choices.slice(0, 3).map((choice, ci) => (
                  <li key={ci}>
                    <div className="flex items-center px-4 py-2 rounded-lg border bg-card text-sm">
                      <span className="mr-2 font-medium text-muted-foreground">
                        {answerLabel(ci)}.
                      </span>
                      {choice.text}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Quiz Locked</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Quizzes are available on the Standard plan. Upgrade to test your knowledge and see
            your scores.
          </p>
        </div>
        <Button asChild>
          <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Standard</Link>
        </Button>
      </div>
    </div>
  )
}
