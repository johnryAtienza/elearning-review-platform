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
 * Uses same-origin <Navigate> for the unauth case so /portal deep links keep
 * their return target and the existing Supabase localStorage session source
 * remains the single source of truth.
 */
export function PortalProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  if (isInitializing) return <PageLoader />

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return (
      <Navigate
        to={`/login?return=${encodeURIComponent(returnTo)}`}
        state={{ from: location }}
        replace
      />
    )
  }

  return <Outlet />
}
