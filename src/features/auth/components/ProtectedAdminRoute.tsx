import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

/**
 * Route guard for /admin/* paths.
 *
 * Checks both authentication AND admin role:
 *   - Unauthenticated   → /login  (with return location preserved)
 *   - Authenticated, non-admin → /  (silent redirect, no sensitive error exposed)
 *   - Authenticated + admin   → renders children
 */
export function ProtectedAdminRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  if (isInitializing) return null

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
