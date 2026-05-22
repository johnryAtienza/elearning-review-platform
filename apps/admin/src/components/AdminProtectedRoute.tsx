import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@s-class/auth/authStore'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Admin-specific auth guard.
 *
 * Behavior:
 *  - while session restoration runs → <PageLoader />
 *  - not authenticated              → Navigate to /login (same-origin)
 *  - authenticated but not admin    → toast + full-page redirect to portal.*
 *  - admin                          → <Outlet />
 *
 * Uses same-origin <Navigate> for the unauth case because, under separate-
 * sessions-per-subdomain, cross-domain redirecting to landing/login would
 * never give admin.* its own session. Each subdomain owns its login flow.
 */
export function AdminProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  const shouldKick = !isInitializing && isAuthenticated && !isAdmin

  useEffect(() => {
    if (shouldKick) {
      toast.error('Access denied — admin area only.')
      window.location.replace(EXTERNAL.portal())
    }
  }, [shouldKick])

  if (isInitializing) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    // Hold here while the effect above triggers the cross-domain bounce.
    return <PageLoader />
  }

  return <Outlet />
}
