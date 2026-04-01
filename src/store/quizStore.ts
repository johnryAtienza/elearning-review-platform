import { create } from 'zustand'
import type { QuizQuestion, QuizResult } from '@/features/quiz/types'

interface QuizState {
  lessonId: string | null
  answers: Record<string, number>    // questionId → selected choice index
  submitted: boolean
  result: QuizResult | null
  setLessonId: (id: string) => void
  setAnswer: (questionId: string, choiceIndex: number) => void
  submitQuiz: (questions: QuizQuestion[]) => void
  resetQuiz: () => void
}

const emptyState = {
  lessonId: null,
  answers: {},
  submitted: false,
  result: null,
}

export const useQuizStore = create<QuizState>((set) => ({
  ...emptyState,

  setLessonId: (id) =>
    set((state) => state.lessonId === id ? state : { ...emptyState, lessonId: id }),

  setAnswer: (questionId, choiceIndex) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: choiceIndex },
    })),

  submitQuiz: (questions) =>
    set((state) => {
      const correct = new Set<string>()
      const wrong = new Set<string>()

      for (const q of questions) {
        const selected = state.answers[q.id]
        if (selected === q.correctAnswer) {
          correct.add(q.id)
        } else {
          wrong.add(q.id)
        }
      }

      return {
        submitted: true,
        result: { score: correct.size, total: questions.length, correct, wrong },
      }
    }),

  resetQuiz: () => set(emptyState),
}))
