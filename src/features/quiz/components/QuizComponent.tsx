import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { QuizQuestion } from '@/features/quiz/types'
import { useQuizStore } from '@/store/quizStore'
import { answerLabel } from '@/features/quiz/utils'
import { ResultSummary } from './ResultSummary'

interface QuizComponentProps {
  questions: QuizQuestion[]
  visible: boolean
}

export function QuizComponent({ questions, visible }: QuizComponentProps) {
  const { answers, submitted, result, setAnswer, submitQuiz, resetQuiz } = useQuizStore()

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length

  function handleSubmit() {
    if (!allAnswered) return
    submitQuiz(questions)
  }

  return (
    <div
      className={cn(
        'space-y-6 transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      aria-hidden={!visible}
    >
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Quiz
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {submitted && result ? (
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
              const selected = answers[q.id]
              const hasImageChoices = q.choices.some((c) => c.imageUrl)
              return (
                <li key={q.id} className="space-y-3">
                  {/* Question stem */}
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

                  {/* Choices */}
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
                                : 'bg-card hover:bg-muted/50 text-foreground'
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
