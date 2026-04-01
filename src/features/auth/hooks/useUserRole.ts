import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/features/auth/types'

export interface UseUserRoleResult {
  role: UserRole
  isAdmin: boolean
  isUser: boolean
}

/**
 * Returns the current user's role and convenience booleans.
 * Reads from the Zustand auth store — no extra network calls.
 */
export function useUserRole(): UseUserRoleResult {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  return {
    role:    user?.role ?? 'user',
    isAdmin,
    isUser: !isAdmin,
  }
}
