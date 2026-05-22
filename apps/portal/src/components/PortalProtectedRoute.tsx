import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Portal-specific auth guard.
 *
 * Behavior:
 *  - while session restoration runs → <PageLoader />
 *  - not authenticated              → Navigate to /login (same-origin)
 *  - authenticated                  → <Outlet />
 *
 * Uses same-origin <Navigate> for the unauth case because, under separate-
 * sessions-per-subdomain, cross-domain bouncing to landing/login would
 * never give portal.* its own session. Each subdomain owns its own login
 * flow — portal's /login, /forgot-password, /reset-password reuse the
 * legacy pages via the existing Vite `@` alias.
 */
export function PortalProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  if (isInitializing) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
