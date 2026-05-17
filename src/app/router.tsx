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
import { ProfilePage } from '@/pages/ProfilePage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
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
const AdminCoursesPage       = lazy(() => import('@/pages/admin/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })))
const AdminLessonsPage       = lazy(() => import('@/pages/admin/AdminLessonsPage').then(m => ({ default: m.AdminLessonsPage })))
const AdminQuizzesPage       = lazy(() => import('@/pages/admin/AdminQuizzesPage').then(m => ({ default: m.AdminQuizzesPage })))
const AdminUsersPage         = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage').then(m => ({ default: m.AdminSubscriptionsPage })))
const AdminCategoriesPage    = lazy(() => import('@/pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })))
const AdminBooksPage         = lazy(() => import('@/pages/admin/AdminBooksPage').then(m => ({ default: m.AdminBooksPage })))
const AdminOrdersPage        = lazy(() => import('@/pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })))

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
      { path: 'courses',          element: <CoursesPage /> },
      { path: 'course/:courseId', element: <CourseDetailPage /> },
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
              { index: true,           element: <AdminDashboardPage />    },
              { path: 'courses',       element: <AdminCoursesPage />      },
              { path: 'lessons',       element: <AdminLessonsPage />      },
              { path: 'quizzes',       element: <AdminQuizzesPage />      },
              { path: 'users',         element: <AdminUsersPage />        },
              { path: 'subscriptions', element: <AdminSubscriptionsPage /> },
              { path: 'categories',    element: <AdminCategoriesPage />   },
              { path: 'books',         element: <AdminBooksPage />        },
              { path: 'orders',        element: <AdminOrdersPage />       },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
