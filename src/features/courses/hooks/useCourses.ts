import { useState, useMemo, useEffect } from 'react'
import { getAllCourses } from '../services/courseService'
import type { Course } from '../types'

export interface UseCoursesResult {
  courses: Course[]
  filtered: Course[]
  categories: string[]
  loading: boolean
  error: string | null
  search: string
  setSearch: (v: string) => void
  category: string
  setCategory: (v: string) => void
}

export function useCourses(): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAllCourses()
      .then((data) => { if (!cancelled) setCourses(data) })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load courses.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(courses.map((c) => c.category))).sort()],
    [courses],
  )

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchCat    = category === 'All' || c.category === category
      const matchSearch =
        search === '' ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [courses, search, category])

  return { courses, filtered, categories, loading, error, search, setSearch, category, setCategory }
}
