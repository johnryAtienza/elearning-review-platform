import { lessonApi } from './lessonApi'
import type { Lesson } from '@s-class/types/lessons'

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  return lessonApi.getByCourse(courseId)
}

export async function getLessonById(lessonId: string): Promise<Lesson | undefined> {
  return lessonApi.getById(lessonId)
}
