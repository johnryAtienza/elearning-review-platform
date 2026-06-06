import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ProtectedAdminRoute } from '@/features/auth/components/ProtectedAdminRoute'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
import { PageLoader } from '@/components/ui/PageLoader'
import { HomePage } from '@/pages/HomePage'
import { AboutPage } from '@/pages/AboutPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { QuizHistoryPage } from '@/pages/QuizHistoryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { SubjectsPage } from '@/pages/SubjectsPage'
import { SubjectDetailPage } from '@/pages/SubjectDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'
import { PaymentCancelPage } from '@/pages/PaymentCancelPage'
import { BooksPage } from '@/pages/BooksPage'
import { BookDetailPage } from '@/pages/BookDetailPage'
import { BookCheckoutPage } from '@/pages/BookCheckoutPage'
import { ContactPage } from '@/pages/ContactPage'
import { FAQPage } from '@/pages/FAQPage'
import { DevicesPage } from '@/pages/DevicesPage'

const AdminDashboardPage     = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminSubjectsPage      = lazy(() => import('@/pages/admin/AdminSubjectsPage').then(m => ({ default: m.AdminSubjectsPage })))
const AdminLessonsPage       = lazy(() => import('@/pages/admin/AdminLessonsPage').then(m => ({ default: m.AdminLessonsPage })))
const AdminQuizzesPage       = lazy(() => import('@/pages/admin/AdminQuizzesPage').then(m => ({ default: m.AdminQuizzesPage })))
const AdminUsersPage         = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage })))
const AdminCoursesPage       = lazy(() => import('@/pages/admin/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })))
const AdminBooksPage         = lazy(() => import('@/pages/admin/AdminBooksPage').then(m => ({ default: m.AdminBooksPage })))
const AdminOrdersPage           = lazy(() => import('@/pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })))
const AdminAnnouncementsPage    = lazy(() => import('@/pages/admin/AdminAnnouncementsPage').then(m => ({ default: m.AdminAnnouncementsPage })))
const AdminWelcomeVideosPage    = lazy(() => import('@/pages/admin/AdminWelcomeVideosPage').then(m => ({ default: m.AdminWelcomeVideosPage })))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Public
      { path: 'about',            element: <AboutPage /> },
      { path: 'contact',          element: <ContactPage /> },
      { path: 'faq',              element: <FAQPage /> },
      // URL path strings preserved per Phase 4 scope; component files renamed.
      { path: 'courses',          element: <SubjectsPage /> },
      { path: 'course/:courseId', element: <SubjectDetailPage /> },
      { path: 'lesson/:lessonId', element: <LessonPage /> },
      { path: 'books',            element: <BooksPage /> },
      { path: 'book/:bookId',     element: <BookDetailPage /> },

      // Password reset — fully public (user arrives from email without a session)
      { path: 'reset-password',   element: <ResetPasswordPage />   },

      // Payment result pages — public so users can land here after redirect
      { path: 'payment-success',  element: <PaymentSuccessPage />  },
      { path: 'payment-cancel',   element: <PaymentCancelPage />   },

      // Auth pages — redirect away if already logged in
      {
        element: <GuestRoute />,
        children: [
          { path: 'login',           element: <LoginPage />           },
          { path: 'register',        element: <RegisterPage />        },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },

      // Authenticated — any logged-in user (free tier with restrictions, standard with full access)
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard',                element: <DashboardPage />    },
          { path: 'quizzes',                  element: <QuizHistoryPage />  },
          { path: 'subscription',             element: <SubscriptionPage /> },
          { path: 'profile',                  element: <ProfilePage />      },
          { path: 'profile/devices',          element: <DevicesPage />      },
          { path: 'book/:bookId/checkout',    element: <BookCheckoutPage /> },
        ],
      },

      // Admin — must be logged in AND role === 'admin'
      {
        element: <ProtectedAdminRoute />,
        children: [
          {
            path: 'admin',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            ),
            children: [
              // URL path strings preserved per Phase 4 scope. Mapping:
              //   /admin/courses     → AdminSubjectsPage (manages Subjects)
              //   /admin/categories  → AdminCoursesPage  (manages parent Courses)
              { index: true,           element: <AdminDashboardPage />    },
              { path: 'courses',       element: <AdminSubjectsPage />     },
              { path: 'lessons',       element: <AdminLessonsPage />      },
              { path: 'quizzes',       element: <AdminQuizzesPage />      },
              { path: 'users',         element: <AdminUsersPage />        },
              { path: 'subscriptions', element: <AdminSubscriptionsPage /> },
              { path: 'categories',    element: <AdminCoursesPage />      },
              { path: 'books',           element: <AdminBooksPage />        },
              { path: 'orders',          element: <AdminOrdersPage />       },
              { path: 'announcements',   element: <AdminAnnouncementsPage /> },
              { path: 'welcome-videos',  element: <AdminWelcomeVideosPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
