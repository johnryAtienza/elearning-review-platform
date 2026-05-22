import { useEffect } from 'react'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

interface RedirectToPortalProps {
  /** Path under the portal origin to send the user to (must start with /) */
  path: string
}

/**
 * Cross-origin redirect helper.
 *
 * Used on landing for the legacy /login, /register, /forgot-password,
 * /reset-password routes — instead of rendering a form (which would create
 * a session on the landing origin that portal can't see), we hand off
 * directly to portal where the auth form actually lives.
 *
 * Preserves the current query string + hash so things like password-reset
 * tokens (`/reset-password#access_token=...`) survive the hop.
 */
export function RedirectToPortal({ path }: RedirectToPortalProps) {
  useEffect(() => {
    const search = window.location.search
    const hash   = window.location.hash
    window.location.replace(`${EXTERNAL.portal()}${path}${search}${hash}`)
  }, [path])

  return <PageLoader />
}
