export interface Course {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnailUrl?: string | null
  category: string
  lessons: number
  duration: string
}
