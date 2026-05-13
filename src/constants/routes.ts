/**
 * Application route paths.
 * Import from here instead of writing '/login', '/courses', etc. as strings.
 * Changing a path only needs to happen in one place — here and in router.tsx.
 */
export const ROUTES = {
  HOME:            '/',
  ABOUT:           '/about',
  LOGIN:           '/login',
  REGISTER:        '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  DASHBOARD:       '/dashboard',
  COURSES:         '/courses',
  SUBSCRIPTION:    '/subscription',
  COURSE:  (id: string) => `/course/${id}`,
  LESSON:  (id: string) => `/lesson/${id}`,

  PROFILE:          '/profile',
  PAYMENT_SUCCESS:  '/payment-success',
  PAYMENT_CANCEL:   '/payment-cancel',

  // Books (Phase C)
  BOOKS:           '/books',
  BOOK:            (id: string) => `/book/${id}`,
  BOOK_CHECKOUT:   (id: string) => `/book/${id}/checkout`,

  // Admin panel
  ADMIN:                '/admin',
  ADMIN_COURSES:        '/admin/courses',
  ADMIN_LESSONS:        '/admin/lessons',
  ADMIN_QUIZZES:        '/admin/quizzes',
  ADMIN_USERS:          '/admin/users',
  ADMIN_SUBSCRIPTIONS:  '/admin/subscriptions',
  ADMIN_CATEGORIES:     '/admin/categories',
  ADMIN_BOOKS:          '/admin/books',
  ADMIN_ORDERS:         '/admin/orders',
} as const
