import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ProtectedAdminRoute } from '@/features/auth/components/ProtectedAdminRoute'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
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
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage'
import { AdminLessonsPage } from '@/pages/admin/AdminLessonsPage'
import { AdminQuizzesPage } from '@/pages/admin/AdminQuizzesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminSubscriptionsPage } from '@/pages/admin/AdminSubscriptionsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminBooksPage } from '@/pages/admin/AdminBooksPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Public
      { path: 'about',            element: <AboutPage /> },
      { path: 'course/:courseId', element: <CourseDetailPage /> },
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
          { path: 'courses',                  element: <CoursesPage />      },
          { path: 'lesson/:lessonId',         element: <LessonPage />       },
          { path: 'profile',                  element: <ProfilePage />      },
          { path: 'book/:bookId/checkout',    element: <BookCheckoutPage /> },
        ],
      },

      // Admin — must be logged in AND role === 'admin'
      {
        element: <ProtectedAdminRoute />,
        children: [
          {
            path: 'admin',
            element: <AdminLayout />,
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
