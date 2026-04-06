import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/features/auth/types'
import {
  login,
  register,
  logout,
  refreshToken,
  getSession,
  onAuthChange,
} from '@/features/auth/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isSubscribed: boolean
  /** Derived from user.role — true when the logged-in user is an admin. */
  isAdmin: boolean
  /**
   * True while the initial session restoration is in progress.
   * Route guards must not redirect until this is false.
   */
  isInitializing: boolean
  /**
   * True after register() when Supabase email confirmation is required.
   * The user has been created but has no active session yet.
   * Cleared automatically on next login or initialize().
   */
  confirmationPending: boolean

  /** Call once at app startup to restore any persisted session. */
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (firstName: string, lastName: string, email: string, password: string, mobileNumber: string) => Promise<void>
  logout: () => Promise<void>
  subscribe: () => void
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isSubscribed: false,
      isAdmin: false,
      isInitializing: true,
      confirmationPending: false,

      initialize: async () => {
        const user = await getSession()
        if (user) set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
        set({ isInitializing: false })

        onAuthChange((user) => {
          if (user) {
            set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' })
          } else {
            set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false })
          }
        })
      },

      login: async (email, password) => {
        const { user } = await login({ email, password })
        set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
      },

      register: async (firstName, lastName, email, password, mobileNumber) => {
        const result = await register({ firstName, lastName, email, password, mobileNumber })
        if (result.awaitingConfirmation) {
          set({ confirmationPending: true })
        } else {
          set({ user: result.user, isAuthenticated: true, isAdmin: result.user.role === 'admin', confirmationPending: false })
        }
      },

      logout: async () => {
        await logout()
        set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false })
      },

      subscribe: () => set({ isSubscribed: true }),

      refreshToken: async () => {
        const token = await refreshToken()
        if (!token) set({ user: null, isAuthenticated: false, isSubscribed: false })
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({ isSubscribed: state.isSubscribed }),
    }
  )
)
