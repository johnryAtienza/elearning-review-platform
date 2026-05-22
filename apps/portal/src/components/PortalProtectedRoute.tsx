import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Portal-specific auth guard.
 *
 * Differs from the shared ProtectedRoute: instead of <Navigate to=ROUTES.LOGIN>
 * (login lives on landing.*, not portal), this does a full-page redirect to
 * the landing /login URL via window.location.replace.
 *
 * Use as the parent of every authenticated portal route.
 */
export function PortalProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      window.location.replace(EXTERNAL.loginPage())
    }
  }, [isInitializing, isAuthenticated])

  if (isInitializing || !isAuthenticated) return <PageLoader />
  return <Outlet />
}
