import config from '@/config'
import type { Lesson, ReviewerContent } from '@/features/lessons/types'
import { LESSONS } from '@/features/lessons/services/lessonData'
import { REVIEWER_CONTENT } from '@/features/lessons/services/reviewerData'
import { apiClient } from './apiClient'
import * as lessonService from './lesson.service'

export const lessonApi = {
  async getByCourse(courseId: string): Promise<Lesson[]> {
    if (config.api.useMock) {
      return LESSONS.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order)
    }
    if (config.auth.provider === 'supabase') return lessonService.getLessonsByCourseId(courseId)
    return apiClient.get<Lesson[]>(`/courses/${courseId}/lessons`)
  },

  async getById(lessonId: string): Promise<Lesson | undefined> {
    if (config.api.useMock)                   return LESSONS.find((l) => l.id === lessonId)
    // Use lesson_previews view — accessible to all authenticated users (subscribed or not).
    // video_url / reviewer_pdf_url are NOT returned here; they are fetched server-side
    // by the get-signed-urls Edge Function and passed to components as signed URLs.
    if (config.auth.provider === 'supabase')  return lessonService.getLessonPreviewById(lessonId)
    return apiClient.get<Lesson>(`/lessons/${lessonId}`)
  },

  async getReviewerContent(lessonId: string): Promise<ReviewerContent | undefined> {
    if (config.api.useMock) return REVIEWER_CONTENT[lessonId]
    if (config.auth.provider === 'supabase') {
      // Falls back to mock reviewer data until a reviewer_contents table is added.
      // See lesson.service.ts → getReviewerContent() for the TODO stub.
      const fromSupabase = await lessonService.getReviewerContent(lessonId)
      return fromSupabase ?? REVIEWER_CONTENT[lessonId]
    }
    return apiClient.get<ReviewerContent>(`/lessons/${lessonId}/reviewer`)
  },
}
