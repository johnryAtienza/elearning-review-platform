import { useEffect } from 'react'
import { EXTERNAL } from '@s-class/constants/urls'
import { PageLoader } from '@s-class/ui/PageLoader'

interface RedirectToPortalProps {
  /** Same-origin student/auth path to send the user to (must start with /) */
  path: string
}

/**
 * Legacy redirect helper.
 *
 * The landing router now renders auth and /portal routes directly. This remains
 * as a small compatibility helper for any old import during the transition.
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
