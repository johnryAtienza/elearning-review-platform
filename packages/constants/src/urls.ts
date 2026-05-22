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

const HOSTS = {
  landing: import.meta.env.VITE_LANDING_URL ?? 'https://s-class.com.ph',
  portal:  import.meta.env.VITE_PORTAL_URL  ?? 'https://portal.s-class.com.ph',
  admin:   import.meta.env.VITE_ADMIN_URL   ?? 'https://admin.s-class.com.ph',
} as const

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
