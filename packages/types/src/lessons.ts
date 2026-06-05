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
   * Historical free-access trigger — superseded by `isFreePreview`. Kept on the
   * type for display ("DAY 1", "DAY 2") and for sorting.
   */
  dayNumber?: number | null
  /**
   * Server-side authoritative free-access flag. When TRUE, the lesson is
   * accessible without a subscription — guests and authenticated free-tier
   * users can fetch its signed video/PDF URLs through the get-signed-urls
   * Edge Function and the lesson plays in full (no 30s preview cap).
   *
   * Source of truth: `public.lessons.is_free_preview` (also exposed on the
   * public `lesson_previews` view). Set by admins; never inferred client-side.
   */
  isFreePreview?: boolean
  /** Present when fetched from Supabase as a subscribed user. */
  videoUrl?: string
  /** Present when fetched from Supabase as a subscribed user. */
  reviewerPdfUrl?: string
}

export interface ReviewerContent {
  summary: string
  keyPoints: string[]
}
