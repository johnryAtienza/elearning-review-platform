import config from '@/config'
import type { Course } from '@/features/courses/types'
import { COURSES } from '@/features/courses/data/courses'
import { apiClient } from './apiClient'
import * as courseService from './course.service'

export const courseApi = {
  async getAll(): Promise<Course[]> {
    if (config.api.useMock)                    return COURSES
    if (config.auth.provider === 'supabase')   return courseService.getCourses()
    return apiClient.get<Course[]>('/courses')
  },

  async getById(id: string): Promise<Course | undefined> {
    if (config.api.useMock)                    return COURSES.find((c) => c.id === id)
    if (config.auth.provider === 'supabase')   return courseService.getCourseById(id)
    return apiClient.get<Course>(`/courses/${id}`)
  },
}
