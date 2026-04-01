import config from '@/config'
import type { Quiz, QuizResult } from '@/features/quiz/types'
import { QUIZ_DATA } from '@/features/quiz/services/quizData'
import { apiClient } from './apiClient'
import { getQuizByLessonId } from './quiz.service'

const QUIZZES_MAP: Record<string, Quiz> = Object.fromEntries(
  QUIZ_DATA.map((q) => [q.lessonId, q])
)

export interface QuizSubmission {
  lessonId: string
  answers: Record<string, number>
}

export const quizApi = {
  async getByLesson(lessonId: string): Promise<Quiz | undefined> {
    if (config.api.useMock) return QUIZZES_MAP[lessonId]
    if (config.auth.provider === 'supabase') return getQuizByLessonId(lessonId)
    return apiClient.get<Quiz>(`/lessons/${lessonId}/quiz`)
  },

  /** Submit answers to the backend and receive a scored result. */
  async submitResult(submission: QuizSubmission): Promise<QuizResult | null> {
    if (config.api.useMock) return null   // scoring is done client-side in mock mode
    return apiClient.post<QuizResult>(`/quizzes/submit`, submission)
  },
}
