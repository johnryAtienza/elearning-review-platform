import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { toast } from 'sonner'
import { PageLoader } from '@/components/ui/PageLoader'

/**
 * Route guard for /admin/* paths.
 *
 * Checks both authentication AND admin role:
 *   - Unauthenticated   → /login  (with return location preserved)
 *   - Authenticated, non-admin → /  (toast + redirect)
 *   - Authenticated + admin   → renders children
 */
export function ProtectedAdminRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)
  const location        = useLocation()

  const shouldDeny = !isInitializing && isAuthenticated && !isAdmin

  useEffect(() => {
    if (shouldDeny) {
      toast.error('Access denied — admin area only.')
    }
  }, [shouldDeny])

  if (isInitializing) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
