import { quizApi } from '@/services/quizApi'
import type { Quiz } from '../types'

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
  return quizApi.getByLesson(lessonId)
}
