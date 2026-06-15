import config from '@s-class/config'
import type { ProblemSet, Quiz, QuizResult } from '@s-class/types/quiz'
import { QUIZ_DATA } from './data/quizData'
import { apiClient } from './apiClient'
import { getProblemSetsByLessonId, getQuizByLessonId } from './quiz.service'

const QUIZZES_MAP: Record<string, Quiz> = Object.fromEntries(
  QUIZ_DATA.map((q) => [q.lessonId, q])
)

export interface QuizSubmission {
  lessonId: string
  answers: Record<string, number>
}

function toDefaultProblemSet(quiz: Quiz): ProblemSet {
  return {
    ...quiz,
    id:                quiz.id ?? `${quiz.lessonId}:elements`,
    title:             quiz.title ?? 'Elements',
    categoryId:        quiz.categoryId ?? `${quiz.lessonId}:elements-category`,
    categoryName:      quiz.categoryName ?? 'Elements',
    categorySortOrder: quiz.categorySortOrder ?? 40,
    sortOrder:         quiz.sortOrder ?? 40,
    status:            quiz.status ?? 'published',
    questionCount:     quiz.questions.length,
  }
}

export const quizApi = {
  async getByLesson(lessonId: string): Promise<Quiz | undefined> {
    if (config.api.useMock) return QUIZZES_MAP[lessonId]
    if (config.auth.provider === 'supabase') return getQuizByLessonId(lessonId)
    return apiClient.get<Quiz>(`/lessons/${lessonId}/quiz`)
  },

  async getProblemSetsByLesson(lessonId: string): Promise<ProblemSet[]> {
    if (config.api.useMock) {
      const quiz = QUIZZES_MAP[lessonId]
      return quiz ? [toDefaultProblemSet(quiz)] : []
    }
    if (config.auth.provider === 'supabase') return getProblemSetsByLessonId(lessonId)
    const quiz = await apiClient.get<Quiz>(`/lessons/${lessonId}/quiz`)
    return quiz ? [toDefaultProblemSet(quiz)] : []
  },

  /** Submit answers to the backend and receive a scored result. */
  async submitResult(submission: QuizSubmission): Promise<QuizResult | null> {
    if (config.api.useMock) return null   // scoring is done client-side in mock mode
    return apiClient.post<QuizResult>(`/quizzes/submit`, submission)
  },
}
