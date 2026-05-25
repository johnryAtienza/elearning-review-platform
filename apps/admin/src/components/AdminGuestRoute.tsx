import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Admin-specific guest guard.
 *
 * Used on the admin /login page. If the user is already authenticated:
 *  - admin     → same-origin Navigate to /admin (their home).
 *  - non-admin → cross-domain bounce to portal.* (they have no business
 *                on admin.* — mirrors AdminProtectedRoute's non-admin kick).
 */
export function AdminGuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  const shouldKickToPortal = !isInitializing && isAuthenticated && !isAdmin

  useEffect(() => {
    if (shouldKickToPortal) {
      window.location.replace(EXTERNAL.portal())
    }
  }, [shouldKickToPortal])

  if (isInitializing) return <PageLoader />

  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />
    return <PageLoader />
  }

  return <Outlet />
}
