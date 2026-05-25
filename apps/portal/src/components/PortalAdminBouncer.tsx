import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@s-class/auth/authStore'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

/**
 * Wraps the entire portal route tree.
 *
 * Admins have no place on portal.* — their canonical home is admin.*.
 * If a logged-in admin lands on any portal URL (login, dashboard, /courses,
 * deep link, etc.) bounce them cross-domain to the admin app.
 *
 * A future "View as Student" / impersonation flow would opt out of this
 * by carrying an explicit flag and is intentionally not handled here.
 */
export function PortalAdminBouncer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin         = useAuthStore((s) => s.isAdmin)
  const isInitializing  = useAuthStore((s) => s.isInitializing)

  const shouldKick = !isInitializing && isAuthenticated && isAdmin

  useEffect(() => {
    if (shouldKick) {
      window.location.replace(EXTERNAL.admin())
    }
  }, [shouldKick])

  if (isInitializing) return <PageLoader />
  if (shouldKick)     return <PageLoader />

  return <Outlet />
}
