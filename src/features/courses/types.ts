export interface Course {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnailUrl?: string | null
  category: string
  /** UUID of the linked categories row — null for legacy/uncategorized courses */
  categoryId?: string | null
  lessons: number
  duration: string
  /** ISO timestamp from created_at — used for "Newest" sort */
  createdAt?: string
  /** Skill level — populated after running add_course_search_indexes migration */
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
  /** Free-form keyword tags for search */
  tags?: string[]
}

export type SortOption = 'relevant' | 'newest' | 'az' | 'most-lessons'
export type DurationFilter = 'all' | 'short' | 'medium' | 'long'
