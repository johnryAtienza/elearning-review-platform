import { courseApi } from './courseApi'
import type { Course } from '@s-class/types/courses'

export async function getAllCourses(): Promise<Course[]> {
  return courseApi.getAll()
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return courseApi.getById(id)
}
