import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { PageLoader } from '@/components/ui/PageLoader'

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
