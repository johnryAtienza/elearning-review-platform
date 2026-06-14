import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { ROUTES } from '@/constants/routes'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Portal-specific guest guard.
 *
 * Used on /login, /register, and /forgot-password. If the user is already
 * signed in, these pages don't make sense — send students to the portal
 * dashboard. Admins are handled by the outer PortalAdminBouncer (cross-origin
 * redirect to admin.*); this guard just holds the render while that effect fires.
 */
export function PortalGuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  if (isInitializing) return <PageLoader />

  if (isAuthenticated) {
    if (isAdmin) return <PageLoader />
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
