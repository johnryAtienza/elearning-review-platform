/**
 * useSubjects
 *
 * Loads all published subjects then applies client-side filtering with:
 *   - 300 ms debounce on the search query
 *   - Fuzzy-scored full-text matching (title › description › tags)
 *   - Course (parent grouping), duration, and difficulty filters
 *   - Sorting: relevant | newest | a-z | most-lessons
 *
 * Structured so it can migrate to server-side search (Supabase full-text
 * search via `search_vector` column) without changing the public API.
 *
 * Naming note: the parent-Course filter list is derived from the legacy
 * `subject.category` text column. Plan §8a will switch the derivation
 * source to the embedded `course:courses(name)` join when the legacy
 * column is dropped.
 */

import { useState, useMemo, useEffect } from 'react'
import { getAllSubjects } from '../services/courseService'
import { useDebounce } from '@/hooks/useDebounce'
import type { Subject, SortOption, DurationFilter } from '../types'

// ── Duration bucketing ────────────────────────────────────────────────────────

/** Parse "6h 30m", "45m", "2h" etc. → total minutes */
function parseDurationMinutes(duration: string): number {
  const h = duration.match(/(\d+)\s*h/)
  const m = duration.match(/(\d+)\s*m/)
  return (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0)
}

function matchesDuration(subject: Subject, filter: DurationFilter): boolean {
  if (filter === 'all') return true
  const mins = parseDurationMinutes(subject.duration)
  if (filter === 'short')  return mins < 180             // < 3 h
  if (filter === 'medium') return mins >= 180 && mins < 360 // 3 – 6 h
  return mins >= 360                                     // ≥ 6 h
}

// ── Fuzzy scoring ─────────────────────────────────────────────────────────────

/**
 * Returns a relevance score ≥ 0.
 * Higher = better match. 0 = no match (exclude from results).
 */
function scoreMatch(subject: Subject, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 1  // no query → all subjects match equally

  const title = subject.title.toLowerCase()
  const desc  = subject.description.toLowerCase()
  const tags  = (subject.tags ?? []).join(' ').toLowerCase()
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
  subjects: Array<Subject & { _score: number }>,
  sort: SortOption,
  hasQuery: boolean,
): Subject[] {
  const sorted = [...subjects].sort((a, b) => {
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

export interface UseSubjectsResult {
  subjects: Subject[]
  filtered: Subject[]
  recommended: Subject[]
  /** Parent-Course names available as filter pills (derived from subject.category). */
  courses: string[]
  loading: boolean
  /** True for the 300 ms debounce window after the user types */
  isSearching: boolean
  error: string | null
  search: string
  setSearch: (v: string) => void
  debouncedSearch: string
  /** Currently selected parent-Course filter (default 'All'). */
  course: string
  setCourse: (v: string) => void
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

export function useSubjects(): UseSubjectsResult {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // Search
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS)
  const isSearching = search !== debouncedSearch

  // Filters
  const [course,   setCourse]   = useState('All')
  const [duration, setDuration] = useState<DurationFilter>('all')

  // Sort
  const [sort, setSort] = useState<SortOption>('relevant')

  // Fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAllSubjects()
      .then((data) => { if (!cancelled) setSubjects(data) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load subjects.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  // Derived parent-Course filter list (still sourced from legacy text column).
  const courses = useMemo(
    () => ['All', ...Array.from(new Set(subjects.map((s) => s.category).filter(Boolean))).sort()],
    [subjects],
  )

  // Filter + score + sort
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim()

    const scored = subjects
      .map((s) => {
        const score = scoreMatch(s, q)
        return { ...s, _score: score }
      })
      .filter(({ _score, category: cat, ...s }) => {
        if (_score === 0 && q !== '') return false
        if (course !== 'All' && cat !== course) return false
        if (!matchesDuration({ ...s, category: cat }, duration)) return false
        return true
      })

    return applySorting(scored, sort, q !== '')
  }, [subjects, debouncedSearch, course, duration, sort])

  // Recommended: top subjects by lesson count (shown when no query + no filters)
  const recommended = useMemo(
    () =>
      [...subjects]
        .sort((a, b) => b.lessons - a.lessons)
        .slice(0, RECOMMENDED_COUNT),
    [subjects],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (course   !== 'All') n++
    if (duration !== 'all') n++
    if (sort !== 'relevant') n++
    return n
  }, [course, duration, sort])

  function clearFilters() {
    setCourse('All')
    setDuration('all')
    setSort('relevant')
  }

  return {
    subjects,
    filtered,
    recommended,
    courses,
    loading,
    isSearching,
    error,
    search,
    setSearch,
    debouncedSearch,
    course,
    setCourse,
    duration,
    setDuration,
    sort,
    setSort,
    activeFilterCount,
    clearFilters,
  }
}
