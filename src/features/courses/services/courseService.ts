import { courseApi } from '@/services/courseApi'
import type { Course } from '../types'

export async function getAllCourses(): Promise<Course[]> {
  return courseApi.getAll()
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return courseApi.getById(id)
}
