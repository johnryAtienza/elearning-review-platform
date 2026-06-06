// Barrel re-export. Prefer subpath imports
// (e.g. `import { useAuthStore } from '@s-class/auth/authStore'`).
//
// NOTE on store ownership:
// savedSubjectsStore and quizHistoryStore are bundled here because authStore
// imperatively calls .fetch() / .reset() on them during login, logout and
// session restoration. They'll move out to apps/portal in a future phase once
// authStore's coupling is refactored into a registerable listener pattern.

export { useAuthStore } from './authStore'
export { useSavedSubjectsStore } from './savedSubjectsStore'
export { useQuizHistoryStore } from './quizHistoryStore'

export { GuestRoute } from './components/GuestRoute'
export { ProtectedRoute } from './components/ProtectedRoute'
export { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
export { DeviceLimitModal } from './components/DeviceLimitModal'

export { useAuth } from './hooks/useAuth'
export { useUserRole } from './hooks/useUserRole'
export type { UseUserRoleResult } from './hooks/useUserRole'
