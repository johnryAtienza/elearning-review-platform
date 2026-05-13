/**
 * Hardcoded announcements list for the public Home page.
 *
 * v1: copy lives here so the client can publish on day one without us
 * shipping an admin editor. When announcements need DB-backed editing,
 * promote this to an `announcements` table with the same fields.
 *
 * Ordering: most-recent first.
 */

export interface Announcement {
  /** ISO date string. Used both for sorting and for display. */
  date: string
  title: string
  /** Plain text body. Keep it short — this is a Home page glance. */
  body: string
  /** Optional CTA — if provided, the announcement gets a button. */
  cta?: { label: string; href: string }
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-05-01',
    title: 'May intake now open',
    body:
      'Enrol any time in May. Daily MC drills and weekly catch-up sessions ' +
      'start the day after your subscription is activated.',
  },
  {
    date: '2026-04-22',
    title: 'New: Power & Industrial Plant track',
    body:
      'Five-week curriculum covering thermodynamics, fuels, boilers, ' +
      'turbines, and refrigeration — now available as part of the Full ' +
      'Mechanical Engineering Review.',
  },
  {
    date: '2026-04-08',
    title: 'Hard-copy books shipping nationwide',
    body:
      'Engineering Mathematics, Machine Design, and Power & Industrial ' +
      'Plant Engineering reviewers are printed and ready. We ship to all ' +
      'PH provinces within 5 business days.',
  },
]
