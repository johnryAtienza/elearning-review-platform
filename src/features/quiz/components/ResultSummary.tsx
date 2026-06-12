import { useEffect, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
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
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

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

              {/* Answer explanation (text and/or image) */}
              {(q.answerText || q.answerImageUrl) && (
                <div className="mt-1 rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Explanation
                  </p>
                  {q.answerText && (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      <MathText text={q.answerText} />
                    </div>
                  )}
                  {q.answerImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({
                          src: q.answerImageUrl!,
                          alt: `Answer explanation for question ${qi + 1}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ImageIcon className="size-4" />
                      View answer image
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <Button variant="outline" onClick={onRetry} className="w-full">
        Retry Quiz
      </Button>

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

// ── ImageLightbox ─────────────────────────────────────────────────────────────
// Full-screen popup for viewing an answer explanation image. Closes on the X
// button, a backdrop click, or the Escape key.

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Answer image"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[90vh] max-w-full rounded-lg bg-white object-contain shadow-xl"
      />
    </div>
  )
}
