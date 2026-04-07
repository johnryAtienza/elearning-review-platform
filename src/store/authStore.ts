import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/features/auth/types'
import type { ActiveSubscription, SubscriptionTier } from '@/features/subscription/types'
import {
  login,
  register,
  logout,
  refreshToken,
  getSession,
  onAuthChange,
} from '@/features/auth/services/authService'
import { supabase } from '@/services/supabaseClient'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isSubscribed: boolean
  /** Full subscription snapshot — null when the user is on the free tier */
  subscription: ActiveSubscription | null
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
  /**
   * Fetch the user's current subscription from Supabase and update the store.
   * Call this after login, on initialize, and after a successful subscribe action.
   */
  syncSubscription: () => Promise<void>
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isSubscribed: false,
      subscription: null,
      isAdmin: false,
      isInitializing: true,
      confirmationPending: false,

      syncSubscription: async () => {
        const { user } = get()
        if (!user) {
          set({ isSubscribed: false, subscription: null })
          return
        }

        const now = new Date()
        const nowIso = now.toISOString()

        const { data, error } = await supabase
          .from('subscriptions')
          .select('tier, duration_months, expires_at, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (error || !data) {
          set({ isSubscribed: false, subscription: null })
          return
        }

        const expiresAt   = data.expires_at ? new Date(data.expires_at as string) : null
        const isExpired   = expiresAt !== null && expiresAt <= now
        const isActive    = !isExpired

        const daysRemaining = (expiresAt && !isExpired)
          ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
          : null

        // Treat an expired-but-active row the same as no subscription
        if (!isActive) {
          set({ isSubscribed: false, subscription: null })
          return
        }

        set({
          isSubscribed: true,
          subscription: {
            tier:           (data.tier as SubscriptionTier) ?? 'standard',
            durationMonths: (data.duration_months as number) ?? 1,
            expiresAt:      data.expires_at as string | null,
            daysRemaining,
            isExpired: false,
          },
        })

        void nowIso // suppress unused-variable lint
      },

      initialize: async () => {
        const user = await getSession()
        if (user) {
          set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
          await get().syncSubscription()
        }
        set({ isInitializing: false })

        onAuthChange(async (user) => {
          if (user) {
            set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' })
            await get().syncSubscription()
          } else {
            set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false, subscription: null })
          }
        })
      },

      login: async (email, password) => {
        const { user } = await login({ email, password })
        set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
        await get().syncSubscription()
      },

      register: async (firstName, lastName, email, password, mobileNumber) => {
        const result = await register({ firstName, lastName, email, password, mobileNumber })
        if (result.awaitingConfirmation) {
          set({ confirmationPending: true })
        } else {
          set({ user: result.user, isAuthenticated: true, isAdmin: result.user.role === 'admin', confirmationPending: false })
          await get().syncSubscription()
        }
      },

      logout: async () => {
        await logout()
        set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false, subscription: null })
      },

      refreshToken: async () => {
        const token = await refreshToken()
        if (!token) set({ user: null, isAuthenticated: false, isSubscribed: false, subscription: null })
      },
    }),
    {
      name: 'auth',
      // Only persist the boolean hint — syncSubscription() always re-derives
      // the full subscription state from Supabase on app startup.
      partialize: (state) => ({ isSubscribed: state.isSubscribed }),
    }
  )
)
