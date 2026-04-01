import { useQuizStore } from '@/store/quizStore'

export function useQuiz() {
  return useQuizStore()
}
