/**
 * Application route paths.
 * Import from here instead of writing '/login', '/courses', etc. as strings.
 * Changing a path only needs to happen in one place — here and in router.tsx.
 *
 * Note on the Subject-domain constants below: the path strings (/courses,
 * /course/:courseId, /admin/courses, /admin/categories) are historical and
 * intentionally retained. The constant names reflect the new
 * Course → Subject domain established by the domain refactor. URL migration
 * is scoped separately — when it happens, only the right-hand values change.
 */
export const ROUTES = {
  HOME:            '/',
  ABOUT:           '/about',
  LOGIN:           '/login',
  REGISTER:        '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  DASHBOARD:       '/dashboard',
  QUIZ_HISTORY:    '/quizzes',
  SUBJECTS:        '/courses',
  SUBSCRIPTION:    '/subscription',
  SUBJECT: (id: string) => `/course/${id}`,
  LESSON:  (id: string) => `/lesson/${id}`,

  // Authenticated student portal (sidebar shell)
  PORTAL_SUBJECTS: '/portal/subjects',
  PORTAL_SUBJECT:  (id: string) => `/portal/subjects/${id}`,

  PROFILE:          '/profile',
  DEVICES:          '/profile/devices',
  PAYMENT_SUCCESS:  '/payment-success',
  PAYMENT_CANCEL:   '/payment-cancel',
  CONTACT:          '/contact',
  FAQ:              '/faq',

  // Books (Phase C)
  BOOKS:           '/books',
  BOOK:            (id: string) => `/book/${id}`,
  BOOK_CHECKOUT:   (id: string) => `/book/${id}/checkout`,

  // Admin panel
  ADMIN:                '/admin',
  ADMIN_SUBJECTS:       '/admin/courses',
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
