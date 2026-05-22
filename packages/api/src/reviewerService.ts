import { lessonApi } from './lessonApi'
import type { ReviewerContent } from '@s-class/types/lessons'

export async function getReviewerContent(lessonId: string): Promise<ReviewerContent | undefined> {
  return lessonApi.getReviewerContent(lessonId)
}
