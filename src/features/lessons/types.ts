export interface Lesson {
  id: string
  courseId: string
  order: number
  title: string
  description: string
  duration: string
  durationMinutes: number | null
  /** Present when fetched from Supabase as a subscribed user. */
  videoUrl?: string
  /** Present when fetched from Supabase as a subscribed user. */
  reviewerPdfUrl?: string
}

export interface ReviewerContent {
  summary: string
  keyPoints: string[]
}
