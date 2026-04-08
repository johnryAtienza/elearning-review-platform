export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  courseCount?: number
  createdAt: string
}

/** Lightweight option used in dropdowns */
export interface CategoryOption {
  id: string
  name: string
  slug: string
}
