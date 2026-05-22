import { quizApi } from './quizApi'
import type { Quiz } from '@s-class/types/quiz'

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
  return quizApi.getByLesson(lessonId)
}
