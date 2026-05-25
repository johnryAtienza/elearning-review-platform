/**
 * Cross-domain navigation helpers for the s-class.com.ph subdomain split.
 *
 * Each app (landing/portal/admin) is served from its own subdomain in
 * production. Cross-app links must do a full-page navigation (set
 * window.location), not react-router's <Link>, since the destination is
 * a different origin.
 *
 * Hosts can be overridden per environment via env vars; defaults match
 * the production layout.
 */

// Fail the production build (and surface early in the Pages build log) if any
// subdomain URL is missing. Falling back to the hardcoded prod defaults below
// would silently send staging links to production — a hard-to-spot footgun.
if (import.meta.env.PROD) {
  for (const k of ['VITE_LANDING_URL', 'VITE_PORTAL_URL', 'VITE_ADMIN_URL'] as const) {
    if (!import.meta.env[k]) {
      throw new Error(`[config] Missing required env var: ${k}`)
    }
  }
}

export const HOSTS = {
  landing: import.meta.env.VITE_LANDING_URL ?? 'https://s-class.com.ph',
  portal:  import.meta.env.VITE_PORTAL_URL  ?? 'https://portal.s-class.com.ph',
  admin:   import.meta.env.VITE_ADMIN_URL   ?? 'https://admin.s-class.com.ph',
} as const

export type Subdomain = 'landing' | 'portal' | 'admin'

export const EXTERNAL = {
  /** Origin of the marketing/landing app (apex). */
  landing: () => HOSTS.landing,
  /** Origin of the authenticated student app. */
  portal:  () => HOSTS.portal,
  /** Origin of the admin panel. */
  admin:   () => HOSTS.admin,

  /** Full URL to send users to after successful login (portal home). */
  loginRedirect: () => `${HOSTS.portal}/`,
  /** Full URL of the admin dashboard. */
  adminRedirect: () => `${HOSTS.admin}/`,
  /** Full URL of the landing /login page (for unauthenticated portal/admin visitors). */
  loginPage:     () => `${HOSTS.landing}/login`,
} as const

// ── Route ownership map ──────────────────────────────────────────────────────
//
// Determines which subdomain "owns" a given path. Used by smart link
// components to decide between same-origin react-router <Link> and a
// full-page cross-origin <a href>.

const ADMIN_PREFIXES = [
  '/admin',
]

const PORTAL_PREFIXES = [
  '/dashboard',
  '/courses',
  '/course/',
  '/lesson/',
  '/books',
  '/book/',
  '/subscription',
  '/profile',
  '/quizzes',
  '/payment-success',
  '/payment-cancel',
  // Auth routes — primary home is portal; landing redirects there.
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
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

/** Which subdomain a path belongs to. Defaults to landing for unknown paths. */
export function getRouteOwner(path: string): Subdomain {
  if (matchesPrefix(path, ADMIN_PREFIXES))  return 'admin'
  if (matchesPrefix(path, PORTAL_PREFIXES)) return 'portal'
  return 'landing'
}

/** Detect which subdomain the current page is on. SSR-safe (returns 'landing'). */
export function getCurrentSubdomain(): Subdomain {
  if (typeof window === 'undefined') return 'landing'
  // Compare full origin (protocol + host + port), not just hostname — in
  // local dev all three apps share hostname 'localhost' and only differ by
  // port, so a hostname-only check would mis-identify the current app.
  const origin = window.location.origin
  try {
    if (origin === new URL(HOSTS.admin).origin)  return 'admin'
    if (origin === new URL(HOSTS.portal).origin) return 'portal'
  } catch {
    /* fall through */
  }
  return 'landing'
}

/** Absolute URL for a path, anchored at its owning subdomain. */
export function getAbsoluteUrl(path: string): string {
  const owner = getRouteOwner(path)
  if (owner === 'admin')  return HOSTS.admin  + path
  if (owner === 'portal') return HOSTS.portal + path
  return HOSTS.landing + path
}
