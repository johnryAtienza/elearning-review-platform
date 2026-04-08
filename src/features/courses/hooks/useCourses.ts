/**
 * useCourses
 *
 * Loads all published courses then applies client-side filtering with:
 *   - 300 ms debounce on the search query
 *   - Fuzzy-scored full-text matching (title › description › tags)
 *   - Category, duration, and difficulty filters
 *   - Sorting: relevant | newest | a-z | most-lessons
 *
 * Structured so it can migrate to server-side search (Supabase full-text
 * search via `search_vector` column) without changing the public API.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { getAllCourses } from '../services/courseService'
import type { Course, SortOption, DurationFilter } from '../types'

// ── Duration bucketing ────────────────────────────────────────────────────────

/** Parse "6h 30m", "45m", "2h" etc. → total minutes */
function parseDurationMinutes(duration: string): number {
  const h = duration.match(/(\d+)\s*h/)
  const m = duration.match(/(\d+)\s*m/)
  return (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0)
}

function matchesDuration(course: Course, filter: DurationFilter): boolean {
  if (filter === 'all') return true
  const mins = parseDurationMinutes(course.duration)
  if (filter === 'short')  return mins < 180             // < 3 h
  if (filter === 'medium') return mins >= 180 && mins < 360 // 3 – 6 h
  return mins >= 360                                     // ≥ 6 h
}

// ── Fuzzy scoring ─────────────────────────────────────────────────────────────

/**
 * Returns a relevance score ≥ 0.
 * Higher = better match. 0 = no match (exclude from results).
 */
function scoreMatch(course: Course, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 1  // no query → all courses match equally

  const title = course.title.toLowerCase()
  const desc  = course.description.toLowerCase()
  const tags  = (course.tags ?? []).join(' ').toLowerCase()
  const all   = `${title} ${desc} ${tags}`

  let score = 0

  // ── Exact / prefix / substring ─────────────────────────────────────────────
  if (title === q)            score += 120
  else if (title.startsWith(q + ' ') || title.startsWith(q)) score += 90
  else if (title.includes(q)) score += 60

  if (desc.includes(q))       score += 25
  if (tags.includes(q))       score += 40

  // ── Word-level matching ─────────────────────────────────────────────────────
  const words = q.split(/\s+/).filter((w) => w.length > 1)
  for (const word of words) {
    if (title.includes(word)) score += 20
    if (desc.includes(word))  score += 8
    if (tags.includes(word))  score += 15
  }

  // ── Fuzzy character-sequence matching (typo tolerance) ─────────────────────
  // Only applied when no substring match found yet — avoids penalising good hits
  if (score === 0) {
    const fuzzy = charSequenceScore(all, q)
    if (fuzzy >= 0.7) score += Math.round(fuzzy * 25)
  }

  return score
}

/**
 * Greedy character-sequence check: what fraction of `query` chars appear
 * in order in `text`?  Returns 0–1.  1 = all chars found in order.
 */
function charSequenceScore(text: string, query: string): number {
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++
  }
  return qi / query.length
}

// ── Sorting ───────────────────────────────────────────────────────────────────

function applySorting(
  courses: Array<Course & { _score: number }>,
  sort: SortOption,
  hasQuery: boolean,
): Course[] {
  const sorted = [...courses].sort((a, b) => {
    if (sort === 'relevant' && hasQuery) return b._score - a._score
    if (sort === 'newest') {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    }
    if (sort === 'az')            return a.title.localeCompare(b.title)
    if (sort === 'most-lessons')  return b.lessons - a.lessons
    // Default (no query + relevant): most lessons first
    return b.lessons - a.lessons
  })
  // Strip internal score before returning
  return sorted.map(({ _score: _s, ...c }) => c)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseCoursesResult {
  courses: Course[]
  filtered: Course[]
  recommended: Course[]
  categories: string[]
  loading: boolean
  /** True for the 300 ms debounce window after the user types */
  isSearching: boolean
  error: string | null
  search: string
  setSearch: (v: string) => void
  debouncedSearch: string
  category: string
  setCategory: (v: string) => void
  duration: DurationFilter
  setDuration: (v: DurationFilter) => void
  sort: SortOption
  setSort: (v: SortOption) => void
  /** Number of active non-default filters (excluding search text) */
  activeFilterCount: number
  clearFilters: () => void
}

const DEBOUNCE_MS = 300
const RECOMMENDED_COUNT = 6

export function useCourses(): UseCoursesResult {
  const [courses,  setCourses]  = useState<Course[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // Search
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSearching,     setIsSearching]     = useState(false)

  // Filters
  const [category, setCategory] = useState('All')
  const [duration, setDuration] = useState<DurationFilter>('all')

  // Sort
  const [sort, setSort] = useState<SortOption>('relevant')

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSetSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value !== debouncedSearch) {
      setIsSearching(true)
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(value)
        setIsSearching(false)
      }, DEBOUNCE_MS)
    }
  }

  // Fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAllCourses()
      .then((data) => { if (!cancelled) setCourses(data) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load courses.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  // Derived categories
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(courses.map((c) => c.category).filter(Boolean))).sort()],
    [courses],
  )

  // Filter + score + sort
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim()

    const scored = courses
      .map((c) => {
        const score = scoreMatch(c, q)
        return { ...c, _score: score }
      })
      .filter(({ _score, category: cat, ...c }) => {
        if (_score === 0 && q !== '') return false
        if (category !== 'All' && cat !== category) return false
        if (!matchesDuration({ ...c, category: cat }, duration)) return false
        return true
      })

    return applySorting(scored, sort, q !== '')
  }, [courses, debouncedSearch, category, duration, sort])

  // Recommended: top courses by lesson count (shown when no query + no filters)
  const recommended = useMemo(
    () =>
      [...courses]
        .sort((a, b) => b.lessons - a.lessons)
        .slice(0, RECOMMENDED_COUNT),
    [courses],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (category !== 'All') n++
    if (duration  !== 'all') n++
    if (sort !== 'relevant') n++
    return n
  }, [category, duration, sort])

  function clearFilters() {
    setCategory('All')
    setDuration('all')
    setSort('relevant')
  }

  return {
    courses,
    filtered,
    recommended,
    categories,
    loading,
    isSearching,
    error,
    search,
    setSearch: handleSetSearch,
    debouncedSearch,
    category,
    setCategory,
    duration,
    setDuration,
    sort,
    setSort,
    activeFilterCount,
    clearFilters,
  }
}
