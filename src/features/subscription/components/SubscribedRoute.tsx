import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

export function SubscribedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSubscribed    = useAuthStore((s) => s.isSubscribed)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  if (isInitializing) return null

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!isSubscribed) {
    return <Navigate to={ROUTES.SUBSCRIPTION} state={{ from: location }} replace />
  }

  return <Outlet />
}
