import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

export function SubscribedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSubscribed    = useAuthStore((s) => s.isSubscribed)
  const location        = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!isSubscribed) {
    return <Navigate to={ROUTES.SUBSCRIPTION} state={{ from: location }} replace />
  }

  return <Outlet />
}
