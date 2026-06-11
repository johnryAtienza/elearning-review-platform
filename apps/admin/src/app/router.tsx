import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '../features/admin/components/AdminLayout'
import { PageLoader } from '@s-class/ui/PageLoader'
import { AdminProtectedRoute } from '../components/AdminProtectedRoute'
import { AdminGuestRoute } from '../components/AdminGuestRoute'
import { AdminLoginPage } from '../pages/AdminLoginPage'

// Lazy-load admin pages — matches the legacy router's lazy pattern.
const AdminDashboardPage     = lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminSubjectsPage      = lazy(() => import('../pages/admin/AdminSubjectsPage').then(m => ({ default: m.AdminSubjectsPage })))
const AdminLessonsPage       = lazy(() => import('../pages/admin/AdminLessonsPage').then(m => ({ default: m.AdminLessonsPage })))
const AdminQuizzesPage       = lazy(() => import('../pages/admin/AdminQuizzesPage').then(m => ({ default: m.AdminQuizzesPage })))
const AdminUsersPage         = lazy(() => import('../pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage })))
const AdminCoursesPage       = lazy(() => import('../pages/admin/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })))
const AdminBooksPage         = lazy(() => import('../pages/admin/AdminBooksPage').then(m => ({ default: m.AdminBooksPage })))
const AdminOrdersPage        = lazy(() => import('../pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })))
const AdminAnnouncementsPage = lazy(() => import('../pages/admin/AdminAnnouncementsPage').then(m => ({ default: m.AdminAnnouncementsPage })))
const AdminWelcomeVideosPage = lazy(() => import('../pages/admin/AdminWelcomeVideosPage').then(m => ({ default: m.AdminWelcomeVideosPage })))

/**
 * Admin subdomain routes.
 *
 * URL shape mirrors the legacy /admin/* paths so AdminLayout's NAV_ITEMS
 * (which use ROUTES.ADMIN_*) work without modification. The subdomain itself
 * carries the "admin" context; the /admin path prefix is structural so
 * existing components stay untouched. Visiting admin.s-class.com.ph/ just
 * redirects to /admin.
 */
export const router = createBrowserRouter([
  // Public — admin's own login page (same-origin so the resulting session
  // lives on admin.* localStorage, not landing.*). Wrapped in AdminGuestRoute
  // so already-signed-in admins skip the form and land on /admin, and
  // non-admin users get bounced cross-domain to portal.*.
  {
    element: <AdminGuestRoute />,
    children: [
      { path: '/login', element: <AdminLoginPage /> },
    ],
  },

  // Auth + role guarded
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        path: '/admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          // URL path strings preserved per Phase 4 scope. Mapping:
          //   /admin/courses     → AdminSubjectsPage (manages Subjects, UI heading "Subjects")
          //   /admin/categories  → AdminCoursesPage  (manages parent Courses, UI heading "Courses")
          { index: true,            element: <AdminDashboardPage />     },
          { path: 'courses',        element: <AdminSubjectsPage />      },
          { path: 'lessons',        element: <AdminLessonsPage />       },
          { path: 'quizzes',        element: <AdminQuizzesPage />       },
          { path: 'users',          element: <AdminUsersPage />         },
          { path: 'subscriptions',  element: <AdminSubscriptionsPage /> },
          { path: 'categories',     element: <AdminCoursesPage />       },
          { path: 'books',          element: <AdminBooksPage />         },
          { path: 'orders',         element: <AdminOrdersPage />        },
          { path: 'announcements',  element: <AdminAnnouncementsPage /> },
          { path: 'welcome-videos', element: <AdminWelcomeVideosPage /> },
        ],
      },
    ],
  },

  // Root and anything else → admin dashboard.
  // (AdminProtectedRoute handles the unauthenticated case from there.)
  { path: '/',  element: <Navigate to="/admin" replace /> },
  { path: '*',  element: <Navigate to="/admin" replace /> },
])
