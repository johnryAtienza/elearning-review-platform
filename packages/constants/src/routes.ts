/**
 * Application route paths.
 * Import from here instead of writing '/login', '/portal/subjects', etc. as strings.
 * Changing a path only needs to happen in one place — here and in router.tsx.
 *
 * Student-facing portal routes live under /portal so the landing site and
 * learning app share one browser origin and one Supabase localStorage session.
 * Admin remains a separate app/origin and keeps its existing /admin paths.
 */
export const ROUTES = {
  HOME:            '/',
  ABOUT:           '/about',
  LOGIN:           '/login',
  REGISTER:        '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  PORTAL:          '/portal',
  DASHBOARD:       '/portal/dashboard',
  QUIZ_HISTORY:    '/portal/quiz-history',
  SUBJECTS:        '/portal/subjects',
  SUBSCRIPTION:    '/portal/subscription',
  SUBJECT: (id: string) => `/portal/subjects/${id}`,
  LESSON:  (id: string) => `/portal/lessons/${id}`,

  // Authenticated student portal (sidebar shell)
  PORTAL_SUBJECTS: '/portal/subjects',
  PORTAL_SUBJECT:  (id: string) => `/portal/subjects/${id}`,

  PROFILE:          '/portal/profile',
  DEVICES:          '/portal/profile/devices',
  PAYMENT_SUCCESS:  '/portal/payment-success',
  PAYMENT_CANCEL:   '/portal/payment-cancel',
  CONTACT:          '/contact',
  FAQ:              '/faq',

  // Books (Phase C)
  BOOKS:           '/books',
  BOOK:            (id: string) => `/book/${id}`,
  BOOK_CHECKOUT:   (id: string) => `/portal/book/${id}/checkout`,

  // Landing-owned marketing & preview routes (Phase 1 separation).
  // /pricing is the marketing variant of /portal/subscription. /preview/* are
  // anon-accessible entry points for the free-preview funnel. Server-side gating
  // still keys on `lessons.is_free_preview`.
  PRICING:         '/pricing',
  PREVIEW_SUBJECT: (id: string) => `/preview/subject/${id}`,
  PREVIEW_LESSON:  (id: string) => `/preview/lesson/${id}`,

  // Admin panel
  ADMIN:                '/admin',
  ADMIN_SUBJECTS:       '/admin/courses',
  // Admin-hosted subject preview — renders SubjectDetailPage same-origin on
  // admin.* so an authenticated admin can view published OR draft subjects.
  ADMIN_SUBJECT_PREVIEW: (id: string) => `/admin/courses/${id}/preview`,
  ADMIN_LESSONS:        '/admin/lessons',
  ADMIN_QUIZZES:        '/admin/quizzes',
  ADMIN_USERS:          '/admin/users',
  ADMIN_SUBSCRIPTIONS:  '/admin/subscriptions',
  ADMIN_COURSES:        '/admin/categories',
  ADMIN_BOOKS:          '/admin/books',
  ADMIN_ORDERS:         '/admin/orders',
  ADMIN_ANNOUNCEMENTS:  '/admin/announcements',
  ADMIN_WELCOME_VIDEOS: '/admin/welcome-videos',
} as const
