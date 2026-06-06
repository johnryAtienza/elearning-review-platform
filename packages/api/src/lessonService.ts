import { lessonApi } from './lessonApi'
import type { Lesson } from '@s-class/types/lessons'

export async function getLessonsBySubject(subjectId: string): Promise<Lesson[]> {
  return lessonApi.getBySubject(subjectId)
}

export async function getLessonById(lessonId: string): Promise<Lesson | undefined> {
  return lessonApi.getById(lessonId)
}
