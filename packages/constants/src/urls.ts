/**
 * Cross-origin navigation helpers for the S Class app split.
 *
 * Landing and the student portal share the same origin:
 *   s-class.com.ph/        public site
 *   s-class.com.ph/login   auth
 *   s-class.com.ph/portal  student portal
 *
 * Admin remains separate at admin.s-class.com.ph.
 *
 * Hosts can be overridden per environment via env vars; defaults match
 * the production layout.
 */

// Fail the production build (and surface early in the Pages build log) if a
// cross-origin target is missing. The student portal intentionally reuses the
// landing origin, so VITE_PORTAL_URL is no longer required or read.
if (import.meta.env.PROD) {
  for (const k of ['VITE_LANDING_URL', 'VITE_ADMIN_URL'] as const) {
    if (!import.meta.env[k]) {
      throw new Error(`[config] Missing required env var: ${k}`)
    }
  }
}

const LANDING_ORIGIN = import.meta.env.VITE_LANDING_URL ?? 'https://s-class.com.ph'

export const HOSTS = {
  landing: LANDING_ORIGIN,
  portal:  LANDING_ORIGIN,
  admin:   import.meta.env.VITE_ADMIN_URL   ?? 'https://admin.s-class.com.ph',
} as const

export type Subdomain = 'landing' | 'portal' | 'admin'

export const EXTERNAL = {
  /** Origin of the marketing/landing app (apex). */
  landing: () => HOSTS.landing,
  /** Origin of the authenticated student portal. Same as landing. */
  portal:  () => HOSTS.portal,
  /** Origin of the admin panel. */
  admin:   () => HOSTS.admin,

  /** Full URL to send users to after successful login (portal home). */
  loginRedirect: () => `${HOSTS.landing}/portal`,
  /** Full URL of the admin dashboard. */
  adminRedirect: () => `${HOSTS.admin}/`,
  /** Full URL of the shared /login page (for unauthenticated visitors). */
  loginPage:     () => `${HOSTS.landing}/login`,
} as const

// ── Route ownership map ──────────────────────────────────────────────────────
//
// Determines which origin owns a given path. Used by smart link components to
// decide between same-origin react-router <Link> and full-page cross-origin
// <a href>.

const ADMIN_PREFIXES = [
  '/admin',
]

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => {
    // Normalize: a trailing slash in the prefix (e.g. '/course/') was
    // intended to signal "parameterized — only matches /course/<sub>", but
    // without this strip the subsequent `p + '/'` check looks for '//'
    // and never matches /course/<id>.
    const base = p.endsWith('/') ? p.slice(0, -1) : p
    return path === base || path.startsWith(base + '/') || path.startsWith(base + '?')
  })
}

/** Which origin a path belongs to. Defaults to landing for unknown paths. */
export function getRouteOwner(path: string): Subdomain {
  if (matchesPrefix(path, ADMIN_PREFIXES))  return 'admin'
  return 'landing'
}

/** Detect which app origin the current page is on. SSR-safe (returns 'landing'). */
export function getCurrentSubdomain(): Subdomain {
  if (typeof window === 'undefined') return 'landing'
  // Compare full origin (protocol + host + port), not just hostname — in
  // local dev all three apps share hostname 'localhost' and only differ by
  // port, so a hostname-only check would mis-identify the current app.
  const origin = window.location.origin
  try {
    if (origin === new URL(HOSTS.admin).origin)  return 'admin'
  } catch {
    /* fall through */
  }
  return 'landing'
}

/** Absolute URL for a path, anchored at its owning origin. */
export function getAbsoluteUrl(path: string): string {
  const owner = getRouteOwner(path)
  if (owner === 'admin')  return HOSTS.admin  + path
  return HOSTS.landing + path
}
