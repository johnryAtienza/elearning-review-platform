/**
 * savedSubjectsStore.ts
 *
 * Global Zustand store for the user's saved (bookmarked) subjects.
 * Provides optimistic UI updates — the UI changes instantly and
 * the Supabase write happens in the background.
 *
 * Call fetch() after the user logs in, and reset() after logout.
 */

import { create } from 'zustand'
import {
  getSavedSubjectIds,
  getSavedSubjectsProgress,
  addSavedSubject,
  removeSavedSubject,
  getDashboardStats,
  type SubjectProgress,
  type DashboardStats,
} from '@s-class/api/savedSubjectsApi'

interface SavedSubjectsState {
  /** Ordered list of saved subject IDs (newest first) */
  savedIds:    string[]
  /** Per-subject lesson progress, keyed by subjectId */
  progressMap: Record<string, SubjectProgress>
  /** Aggregated dashboard metrics */
  stats:       DashboardStats
  loading:     boolean
  initialized: boolean

  /** Load savedIds + progress + stats from Supabase */
  fetch:    () => Promise<void>
  /** Add a subject (optimistic) */
  add:      (subjectId: string) => Promise<void>
  /** Remove a subject (optimistic) */
  remove:   (subjectId: string) => Promise<void>
  /** Toggle save state */
  toggle:   (subjectId: string) => Promise<void>
  /** True when subjectId is in savedIds */
  isSaved:  (subjectId: string) => boolean
  /** Clear all state on logout */
  reset:    () => void
}

const DEFAULT_STATS: DashboardStats = {
  subjectsSaved:    0,
  lessonsCompleted: 0,
  quizzesTaken:     0,
}

export const useSavedSubjectsStore = create<SavedSubjectsState>((set, get) => ({
  savedIds:    [],
  progressMap: {},
  stats:       DEFAULT_STATS,
  loading:     false,
  initialized: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const [ids, progress, stats] = await Promise.all([
        getSavedSubjectIds(),
        getSavedSubjectsProgress(),
        getDashboardStats(),
      ])

      const progressMap: Record<string, SubjectProgress> = {}
      for (const p of progress) {
        progressMap[p.subjectId] = p
      }

      set({ savedIds: ids, progressMap, stats, initialized: true })
    } catch {
      // Silently fail — user may be unauthenticated
    } finally {
      set({ loading: false })
    }
  },

  add: async (subjectId) => {
    // Optimistic: prepend the id and bump stats
    set((s) => ({
      savedIds: [subjectId, ...s.savedIds.filter((id) => id !== subjectId)],
      stats:    { ...s.stats, subjectsSaved: s.stats.subjectsSaved + 1 },
    }))
    try {
      await addSavedSubject(subjectId)
    } catch {
      // Rollback
      set((s) => ({
        savedIds: s.savedIds.filter((id) => id !== subjectId),
        stats:    { ...s.stats, subjectsSaved: Math.max(0, s.stats.subjectsSaved - 1) },
      }))
    }
  },

  remove: async (subjectId) => {
    // Optimistic: remove the id and decrement stats
    set((s) => ({
      savedIds: s.savedIds.filter((id) => id !== subjectId),
      stats:    { ...s.stats, subjectsSaved: Math.max(0, s.stats.subjectsSaved - 1) },
    }))
    try {
      await removeSavedSubject(subjectId)
    } catch {
      // Re-fetch to restore correct state
      get().fetch()
    }
  },

  toggle: async (subjectId) => {
    if (get().isSaved(subjectId)) {
      await get().remove(subjectId)
    } else {
      await get().add(subjectId)
    }
  },

  isSaved: (subjectId) => get().savedIds.includes(subjectId),

  reset: () =>
    set({ savedIds: [], progressMap: {}, stats: DEFAULT_STATS, initialized: false }),
}))
