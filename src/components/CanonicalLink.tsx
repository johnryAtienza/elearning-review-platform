import { useEffect } from 'react'
import { HOSTS, getCurrentSubdomain, type Subdomain } from '@s-class/constants/urls'

interface CanonicalLinkProps {
  /** Path under the owner origin that should be considered canonical. */
  path: string
  /** Which origin owns the canonical URL. */
  owner: Subdomain
}

/**
 * Emit `<link rel="canonical">` so crawlers prefer the owner origin's copy
 * of a page that is temporarily served from multiple origins during the
 * Landing/Portal migration. Self-canonical (same origin as the owner)
 * silently no-ops to avoid noisy headers.
 *
 * Imperative DOM mutation rather than React 19's hoisted `<link>` so we can
 * remove the tag cleanly when the component unmounts (route changes between
 * canonical-bearing pages).
 */
export function CanonicalLink({ path, owner }: CanonicalLinkProps) {
  useEffect(() => {
    if (getCurrentSubdomain() === owner) return

    const origin = HOSTS[owner]
    const href = `${origin}${path}`

    const tag = document.createElement('link')
    tag.rel = 'canonical'
    tag.href = href
    tag.setAttribute('data-canonical-link', 'migration')
    document.head.appendChild(tag)

    return () => {
      tag.remove()
    }
  }, [path, owner])

  return null
}
