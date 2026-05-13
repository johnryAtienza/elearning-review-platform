export interface Lesson {
  id: string
  courseId: string
  order: number
  title: string
  description: string
  duration: string
  durationMinutes: number | null
  /**
   * Curriculum week (1-based). Populated after the add_lesson_week_day
   * migration runs. Optional so existing data without the column doesn't
   * break the build.
   */
  weekNumber?: number | null
  /**
   * Curriculum day (1-based, sequential within the course).
   * Day 1 lessons are free for all authenticated users (subscription bypass).
   */
  dayNumber?: number | null
  /** Present when fetched from Supabase as a subscribed user. */
  videoUrl?: string
  /** Present when fetched from Supabase as a subscribed user. */
  reviewerPdfUrl?: string
}

export interface ReviewerContent {
  summary: string
  keyPoints: string[]
}
