import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../authStore'
import { ROUTES } from '@s-class/constants/routes'
import { PageLoader } from '@s-class/ui/PageLoader'

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  if (isInitializing) return <PageLoader />

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? ROUTES.ADMIN : ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
