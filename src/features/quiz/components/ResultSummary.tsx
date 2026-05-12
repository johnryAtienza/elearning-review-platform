import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { QuizQuestion } from '@/features/quiz/types'
import { answerLabel, PASSING_SCORE_PCT } from '@/features/quiz/utils'
import { MathText } from '@/components/MathText'

interface ResultSummaryProps {
  questions: QuizQuestion[]
  answers: Record<string, number>
  result: { score: number; total: number; correct: Set<string>; wrong: Set<string> }
  onRetry: () => void
}

export function ResultSummary({ questions, answers, result, onRetry }: ResultSummaryProps) {
  const pct = Math.round((result.score / result.total) * 100)
  const passed = pct >= PASSING_SCORE_PCT

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div
        className={cn(
          'rounded-xl border p-6 text-center space-y-1',
          passed ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10'
        )}
      >
        <p className={cn('text-4xl font-bold', passed ? 'text-success' : 'text-destructive')}>
          {pct}%
        </p>
        <p className={cn('text-sm font-medium', passed ? 'text-success' : 'text-destructive')}>
          {result.score} / {result.total} correct &mdash;{' '}
          {passed ? 'Great work!' : 'Keep reviewing and try again.'}
        </p>
      </div>

      {/* Per-question breakdown */}
      <ol className="space-y-4">
        {questions.map((q, qi) => {
          const isCorrect = result.correct.has(q.id)
          const selected = answers[q.id]
          const hasImageChoices = q.choices.some((c) => c.imageUrl)

          return (
            <li key={q.id} className={cn('rounded-lg border p-4 space-y-2', isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
              {/* Question stem */}
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  <span className="mr-1.5">{isCorrect ? '✓' : '✗'}</span>
                  <span className="mr-2 text-muted-foreground">{qi + 1}.</span>
                  <MathText text={q.question} />
                </p>
                {q.questionImageUrl && (
                  <img
                    src={q.questionImageUrl}
                    alt={`Question ${qi + 1}`}
                    className="rounded-lg border max-h-48 object-contain"
                  />
                )}
              </div>

              <ul className={cn('gap-2', hasImageChoices ? 'grid grid-cols-2 sm:grid-cols-4' : 'space-y-1')}>
                {q.choices.map((choice, ci) => {
                  const isSelected = selected === ci
                  const isAnswer = q.correctAnswer === ci

                  return (
                    <li
                      key={ci}
                      className={cn(
                        'rounded text-sm',
                        hasImageChoices
                          ? cn(
                              'flex flex-col items-center gap-1 border p-1.5',
                              isAnswer && 'border-success/50 bg-success/15',
                              isSelected && !isAnswer && 'border-destructive/50 bg-destructive/15',
                              !isAnswer && !isSelected && 'border-transparent',
                            )
                          : cn(
                              'flex items-center gap-2 px-3 py-1.5',
                              isAnswer && 'bg-success/15 text-success font-medium',
                              isSelected && !isAnswer && 'bg-destructive/15 text-destructive',
                            )
                      )}
                    >
                      {choice.imageUrl ? (
                        <>
                          <img
                            src={choice.imageUrl}
                            alt={choice.text || `Option ${answerLabel(ci)}`}
                            className="rounded object-contain max-h-20 w-full"
                          />
                          {choice.text && (
                            <MathText text={choice.text} className="text-xs" />
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground shrink-0">
                            {answerLabel(ci)}.
                          </span>
                          <MathText text={choice.text} />
                        </>
                      )}
                      {isAnswer && (
                        <span className={cn('text-xs text-success font-semibold', hasImageChoices ? '' : 'ml-auto')}>
                          Correct
                        </span>
                      )}
                      {isSelected && !isAnswer && (
                        <span className={cn('text-xs text-destructive font-semibold', hasImageChoices ? '' : 'ml-auto')}>
                          Your answer
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>

      <Button variant="outline" onClick={onRetry} className="w-full">
        Retry Quiz
      </Button>
    </div>
  )
}
