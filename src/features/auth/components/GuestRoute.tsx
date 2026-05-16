import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { PageLoader } from '@/components/ui/PageLoader'

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
