import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@s-class/types/auth'
import type { ActiveSubscription, SubscriptionTier } from '@s-class/types/subscription'
import type { UserDevice } from '@s-class/types/devices'
import {
  login,
  register,
  logout,
  refreshToken,
  getSession,
  onAuthChange,
} from '@s-class/api/authService'
import { supabase } from '@s-class/api/supabaseClient'
import { registerCurrentDevice, DeviceLimitError } from '@s-class/api/devicesApi'
import { useSavedCoursesStore } from './savedCoursesStore'
import { useQuizHistoryStore } from './quizHistoryStore'

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

  /**
   * Phase G — when device registration is blocked by the hard cap
   * (1 mobile + 1 desktop), this carries the user's current active
   * devices so the UI can render DeviceLimitModal. Cleared on:
   *   - successful revoke + retry
   *   - explicit dismissal
   */
  pendingDeviceLimit: UserDevice[] | null

  /** Call once at app startup to restore any persisted session. */
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    mobileNumber: string,
    school: string,
    schoolId: string,
  ) => Promise<void>
  logout: () => Promise<void>
  /** Patch the in-memory user after a profile update without a full re-fetch. */
  setUser: (updates: Partial<User>) => void
  /**
   * Fetch the user's current subscription from Supabase and update the store.
   * Call this after login, on initialize, and after a successful subscribe action.
   */
  syncSubscription: () => Promise<void>
  refreshToken: () => Promise<void>
  /** Dismiss the device-limit modal without revoking anything. */
  clearPendingDeviceLimit: () => void
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
      pendingDeviceLimit: null,

      syncSubscription: async () => {
        const { user } = get()
        if (!user) {
          set({ isSubscribed: false, subscription: null })
          return
        }

        const now = new Date()

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
      },

      initialize: async () => {
        const user = await getSession()
        if (user) {
          set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
          await get().syncSubscription()
          void useSavedCoursesStore.getState().fetch()
          void useQuizHistoryStore.getState().fetch()
          // Phase G — register/touch this device. On limit_reached, sign
          // the user out locally and surface the modal so they can revoke
          // an existing device before retrying.
          try {
            await registerCurrentDevice()
          } catch (err) {
            if (err instanceof DeviceLimitError) {
              await logout()
              set({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isSubscribed: false,
                subscription: null,
                pendingDeviceLimit: err.devices,
              })
              useSavedCoursesStore.getState().reset()
              useQuizHistoryStore.getState().reset()
            } else {
              console.warn('[authStore] registerCurrentDevice failed (non-blocking):', err)
            }
          }
        }
        set({ isInitializing: false })

        onAuthChange(async (user) => {
          if (user) {
            set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' })
            await get().syncSubscription()
            void useSavedCoursesStore.getState().fetch()
            void useQuizHistoryStore.getState().fetch()
          } else {
            set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false, subscription: null })
            useSavedCoursesStore.getState().reset()
            useQuizHistoryStore.getState().reset()
          }
        })
      },

      login: async (email, password) => {
        const { user } = await login({ email, password })
        set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', confirmationPending: false })
        await get().syncSubscription()
        void useSavedCoursesStore.getState().fetch()
        void useQuizHistoryStore.getState().fetch()
        // Phase G — register device. If limit hit, sign out and re-throw
        // so LoginPage can mount DeviceLimitModal.
        try {
          await registerCurrentDevice()
        } catch (err) {
          if (err instanceof DeviceLimitError) {
            await logout()
            set({
              user: null,
              isAuthenticated: false,
              isAdmin: false,
              isSubscribed: false,
              subscription: null,
              pendingDeviceLimit: err.devices,
            })
            useSavedCoursesStore.getState().reset()
            useQuizHistoryStore.getState().reset()
            throw err
          }
          // Non-fatal otherwise — user remains logged in.
          console.warn('[authStore] registerCurrentDevice failed (non-blocking):', err)
        }
      },

      register: async (firstName, lastName, email, password, mobileNumber, school, schoolId) => {
        const result = await register({ firstName, lastName, email, password, mobileNumber, school, schoolId })
        if (result.awaitingConfirmation) {
          set({ confirmationPending: true })
        } else {
          set({ user: result.user, isAuthenticated: true, isAdmin: result.user.role === 'admin', confirmationPending: false })
          await get().syncSubscription()
          // Phase G — same flow as login.
          try {
            await registerCurrentDevice()
          } catch (err) {
            if (err instanceof DeviceLimitError) {
              await logout()
              set({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isSubscribed: false,
                subscription: null,
                pendingDeviceLimit: err.devices,
              })
              useSavedCoursesStore.getState().reset()
              useQuizHistoryStore.getState().reset()
              throw err
            }
            console.warn('[authStore] registerCurrentDevice failed (non-blocking):', err)
          }
        }
      },

      clearPendingDeviceLimit: () => set({ pendingDeviceLimit: null }),

      logout: async () => {
        await logout()
        set({ user: null, isAuthenticated: false, isAdmin: false, isSubscribed: false, subscription: null })
        useSavedCoursesStore.getState().reset()
        useQuizHistoryStore.getState().reset()
      },

      refreshToken: async () => {
        const token = await refreshToken()
        if (!token) set({ user: null, isAuthenticated: false, isSubscribed: false, subscription: null })
      },

      setUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : state.user,
        }))
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
