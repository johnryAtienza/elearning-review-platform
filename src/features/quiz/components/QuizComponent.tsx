import { useState, useMemo } from 'react'
import { Lock, ChevronRight, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { QuizQuestion } from '@/features/quiz/types'
import { useQuizStore } from '@/store/quizStore'
import { answerLabel } from '@/features/quiz/utils'
import { ResultSummary } from './ResultSummary'
import { ROUTES } from '@/constants/routes'
import { MathText } from '@/components/MathText'

interface QuizComponentProps {
  questions: QuizQuestion[]
  visible: boolean
  description?: string | null
  randomize?: boolean
  /**
   * When true the quiz is locked (free tier).
   * Shows a blurred teaser + upgrade CTA instead of the real questions.
   */
  locked?: boolean
}

export function QuizComponent({ questions, visible, description, randomize = false, locked = false }: QuizComponentProps) {
  const { answers, submitted, result, setAnswer, submitQuiz, resetQuiz } = useQuizStore()

  // Shuffle questions once on mount only if randomize is enabled
  const shuffled = useMemo(() => {
    if (!randomize) return questions
    const copy = [...questions]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }, [questions, randomize])

  const [currentIndex, setCurrentIndex] = useState(0)

  const currentQuestion = shuffled[currentIndex]
  const isLast         = currentIndex === shuffled.length - 1
  const hasAnswered    = currentQuestion ? answers[currentQuestion.id] !== undefined : false

  function handleNext() {
    if (isLast) {
      submitQuiz(shuffled)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function handleBack() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function handleReset() {
    resetQuiz()
    setCurrentIndex(0)
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
          questions={shuffled}
          answers={answers}
          result={result}
          onRetry={handleReset}
        />
      ) : (
        <>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Question {currentIndex + 1} of {shuffled.length}</span>
              <span>{Object.keys(answers).length} answered</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / shuffled.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current question */}
          {currentQuestion && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" key={currentQuestion.id}>
              {/* Question */}
              <div className="space-y-2">
                <p className="font-semibold text-base leading-snug">
                  <MathText text={currentQuestion.question} />
                </p>
                {currentQuestion.questionImageUrl && (
                  <img
                    src={currentQuestion.questionImageUrl}
                    alt="Question"
                    className="rounded-lg border max-h-64 object-contain mt-1"
                  />
                )}
              </div>

              {/* Choices */}
              <QuestionChoices
                question={currentQuestion}
                selected={answers[currentQuestion.id]}
                onSelect={(ci) => setAnswer(currentQuestion.id, ci)}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!hasAnswered}
              className="gap-1.5"
            >
              {isLast ? 'Submit Quiz' : 'Next'}
              {!isLast && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ── QuestionChoices ───────────────────────────────────────────────────────────

function QuestionChoices({
  question,
  selected,
  onSelect,
}: {
  question: QuizQuestion
  selected: number | undefined
  onSelect: (ci: number) => void
}) {
  const hasImageChoices = question.choices.some((c) => c.imageUrl)

  if (hasImageChoices) {
    return (
      <ul className="space-y-2">
        {question.choices.map((choice, ci) => {
          const isSelected = selected === ci
          return (
            <li key={ci}>
              <button
                onClick={() => onSelect(ci)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted/50',
                )}
              >
                <span className={cn(
                  'shrink-0 font-semibold w-5 text-right self-start pt-1',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {answerLabel(ci)}.
                </span>
                <div className="flex flex-col gap-1">
                  <img
                    src={choice.imageUrl!}
                    alt={choice.text || `Option ${answerLabel(ci)}`}
                    className="rounded object-contain max-h-16 max-w-50"
                  />
                  {choice.text && (
                    <MathText text={choice.text} className={cn('text-sm', isSelected && 'font-medium')} />
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="space-y-1">
      {question.choices.map((choice, ci) => {
        const isSelected = selected === ci
        return (
          <li key={ci}>
            <button
              onClick={() => onSelect(ci)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors',
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted/50',
              )}
            >
              <span className={cn(
                'shrink-0 font-semibold w-5 text-right',
                isSelected ? 'text-primary' : 'text-muted-foreground',
              )}>
                {answerLabel(ci)}.
              </span>
              <MathText text={choice.text} className={cn(isSelected && 'font-medium')} />
            </button>
          </li>
        )
      })}
    </ul>
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
        <ol className="space-y-6">
          {preview.map((q, qi) => (
            <li key={q.id} className="space-y-2">
              <p className="font-semibold text-base leading-snug">
                <span className="mr-2 text-muted-foreground font-normal">{qi + 1}.</span>
                <MathText text={q.question} />
              </p>
              <ul className="space-y-1">
                {q.choices.slice(0, 3).map((choice, ci) => (
                  <li key={ci}>
                    <div className="flex items-start gap-3 px-3 py-2 text-sm">
                      <span className="shrink-0 font-semibold w-5 text-right text-muted-foreground">
                        {answerLabel(ci)}.
                      </span>
                      <MathText text={choice.text} />
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
