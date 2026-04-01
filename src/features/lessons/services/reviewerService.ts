import { lessonApi } from '@/services/lessonApi'
import type { ReviewerContent } from '../types'

export async function getReviewerContent(lessonId: string): Promise<ReviewerContent | undefined> {
  return lessonApi.getReviewerContent(lessonId)
}
