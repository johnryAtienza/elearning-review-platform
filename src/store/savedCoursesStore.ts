/**
 * savedCoursesStore.ts
 *
 * Global Zustand store for the user's saved (bookmarked) courses.
 * Provides optimistic UI updates — the UI changes instantly and
 * the Supabase write happens in the background.
 *
 * Call fetch() after the user logs in, and reset() after logout.
 */

import { create } from 'zustand'
import {
  getSavedCourseIds,
  getSavedCoursesProgress,
  addSavedCourse,
  removeSavedCourse,
  getDashboardStats,
  type CourseProgress,
  type DashboardStats,
} from '@/services/savedCoursesApi'

interface SavedCoursesState {
  /** Ordered list of saved course IDs (newest first) */
  savedIds:    string[]
  /** Per-course lesson progress, keyed by courseId */
  progressMap: Record<string, CourseProgress>
  /** Aggregated dashboard metrics */
  stats:       DashboardStats
  loading:     boolean
  initialized: boolean

  /** Load savedIds + progress + stats from Supabase */
  fetch:    () => Promise<void>
  /** Add a course (optimistic) */
  add:      (courseId: string) => Promise<void>
  /** Remove a course (optimistic) */
  remove:   (courseId: string) => Promise<void>
  /** Toggle save state */
  toggle:   (courseId: string) => Promise<void>
  /** True when courseId is in savedIds */
  isSaved:  (courseId: string) => boolean
  /** Clear all state on logout */
  reset:    () => void
}

const DEFAULT_STATS: DashboardStats = {
  coursesSaved:     0,
  lessonsCompleted: 0,
  quizzesTaken:     0,
}

export const useSavedCoursesStore = create<SavedCoursesState>((set, get) => ({
  savedIds:    [],
  progressMap: {},
  stats:       DEFAULT_STATS,
  loading:     false,
  initialized: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const [ids, progress, stats] = await Promise.all([
        getSavedCourseIds(),
        getSavedCoursesProgress(),
        getDashboardStats(),
      ])

      const progressMap: Record<string, CourseProgress> = {}
      for (const p of progress) {
        progressMap[p.courseId] = p
      }

      set({ savedIds: ids, progressMap, stats, initialized: true })
    } catch {
      // Silently fail — user may be unauthenticated
    } finally {
      set({ loading: false })
    }
  },

  add: async (courseId) => {
    // Optimistic: prepend the id and bump stats
    set((s) => ({
      savedIds: [courseId, ...s.savedIds.filter((id) => id !== courseId)],
      stats:    { ...s.stats, coursesSaved: s.stats.coursesSaved + 1 },
    }))
    try {
      await addSavedCourse(courseId)
    } catch {
      // Rollback
      set((s) => ({
        savedIds: s.savedIds.filter((id) => id !== courseId),
        stats:    { ...s.stats, coursesSaved: Math.max(0, s.stats.coursesSaved - 1) },
      }))
    }
  },

  remove: async (courseId) => {
    // Optimistic: remove the id and decrement stats
    set((s) => ({
      savedIds: s.savedIds.filter((id) => id !== courseId),
      stats:    { ...s.stats, coursesSaved: Math.max(0, s.stats.coursesSaved - 1) },
    }))
    try {
      await removeSavedCourse(courseId)
    } catch {
      // Re-fetch to restore correct state
      get().fetch()
    }
  },

  toggle: async (courseId) => {
    if (get().isSaved(courseId)) {
      await get().remove(courseId)
    } else {
      await get().add(courseId)
    }
  },

  isSaved: (courseId) => get().savedIds.includes(courseId),

  reset: () =>
    set({ savedIds: [], progressMap: {}, stats: DEFAULT_STATS, initialized: false }),
}))
