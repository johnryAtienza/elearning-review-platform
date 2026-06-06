import { subjectApi } from './subjectApi'
import type { Subject } from '@s-class/types/subjects'

// Thin convenience wrapper around the subjectApi router.

export async function getAllSubjects(): Promise<Subject[]> {
  return subjectApi.getAll()
}

export async function getSubjectById(id: string): Promise<Subject | undefined> {
  return subjectApi.getById(id)
}
