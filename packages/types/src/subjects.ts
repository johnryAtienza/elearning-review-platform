/**
 * Subject — the per-domain offering students browse and study.
 * In the academic hierarchy: Course → Subject → Lesson + Quiz.
 *
 * This file was `courses.ts` before the Phase 3 rename. The legacy
 * `category` text field is intentionally retained until the cleanup
 * migration drops the underlying DB column (plan §8a).
 */
export interface Subject {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnailUrl?: string | null
  /** Legacy denormalized text — parent-Course name. Kept until plan §8a cleanup. */
  category: string
  /** UUID of the parent Course (FK to courses table). Null for unassigned subjects. */
  courseId?: string | null
  lessons: number
  duration: string
  /** ISO timestamp from created_at — used for "Newest" sort */
  createdAt?: string
  /** Admin-managed display order. Lower values appear first. */
  sortOrder?: number
  /** Skill level — populated after running add_course_search_indexes migration */
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
  /** Free-form keyword tags for search */
  tags?: string[]
  /** Whether the subject is published and visible to students. Undefined for legacy data. */
  isPublished?: boolean
}

export type SortOption = 'relevant' | 'newest' | 'az' | 'most-lessons'
export type DurationFilter = 'all' | 'short' | 'medium' | 'long'
