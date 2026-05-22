import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Landing-specific guest guard.
 *
 * Differs from the shared GuestRoute: instead of <Navigate to=ROUTES.DASHBOARD>
 * (which would 404 on landing — /dashboard lives on portal.*), this does a
 * full-page redirect to the portal/admin origin via window.location.
 *
 * Use on routes like /login, /register, /forgot-password where a logged-in
 * user shouldn't see the form.
 */
export function LandingGuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      window.location.replace(isAdmin ? EXTERNAL.adminRedirect() : EXTERNAL.loginRedirect())
    }
  }, [isInitializing, isAuthenticated, isAdmin])

  if (isInitializing || isAuthenticated) return <PageLoader />
  return <Outlet />
}
