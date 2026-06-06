import { subjectApi } from './subjectApi'
import type { Course } from '@s-class/types/courses'

// Thin convenience wrapper around the subjectApi router. The `Course` return
// type is renamed to `Subject` in Phase 3 of the domain refactor.

export async function getAllSubjects(): Promise<Course[]> {
  return subjectApi.getAll()
}

export async function getSubjectById(id: string): Promise<Course | undefined> {
  return subjectApi.getById(id)
}
