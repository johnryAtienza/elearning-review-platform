/**
 * Course — the parent academic grouping (e.g. "Engineering",
 * "Information Technology"). Contains many Subjects.
 *
 * This file was `categories.ts` before the Phase 3 rename.
 */
export type CourseStatus = 'draft' | 'published' | 'archived'

export interface Course {
  id: string
  name: string
  slug: string
  description: string | null
  status: CourseStatus
  /** Count of subjects assigned to this course. Populated by getCoursesWithCount. */
  subjectCount?: number
  createdAt: string
}

/** Lightweight option used in dropdowns. */
export interface CourseOption {
  id: string
  name: string
  slug: string
}
