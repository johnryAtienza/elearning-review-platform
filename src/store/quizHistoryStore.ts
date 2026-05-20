/**
 * quizHistoryStore.ts
 *
 * Global Zustand store for the user's quiz attempt history.
 * Backed by the `quiz_results` table via the get_quiz_history() RPC.
 *
 * Call fetch() after login/initialize and after a quiz is submitted.
 * Call reset() on logout.
 */

import { create } from 'zustand'
import { getQuizHistory, type QuizAttempt } from '@/services/quizResultsApi'

interface QuizHistoryState {
  attempts:    QuizAttempt[]
  loading:     boolean
  initialized: boolean

  fetch: () => Promise<void>
  reset: () => void
}

export const useQuizHistoryStore = create<QuizHistoryState>((set) => ({
  attempts:    [],
  loading:     false,
  initialized: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const attempts = await getQuizHistory()
      set({ attempts, initialized: true })
    } catch {
      // Silently fail — user may be unauthenticated
    } finally {
      set({ loading: false })
    }
  },

  reset: () => set({ attempts: [], initialized: false }),
}))
