import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../authStore'
import { ROUTES } from '@s-class/constants/routes'
import { PageLoader } from '@s-class/ui/PageLoader'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location = useLocation()

  if (isInitializing) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (isAdmin && location.pathname === ROUTES.DASHBOARD) {
    return <Navigate to={ROUTES.ADMIN} replace />
  }

  return <Outlet />
}
