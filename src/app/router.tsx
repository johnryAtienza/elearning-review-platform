import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ProtectedAdminRoute } from '@/features/auth/components/ProtectedAdminRoute'
import { SubscribedRoute } from '@/features/subscription/components/SubscribedRoute'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage'
import { AdminLessonsPage } from '@/pages/admin/AdminLessonsPage'
import { AdminQuizzesPage } from '@/pages/admin/AdminQuizzesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminSubscriptionsPage } from '@/pages/admin/AdminSubscriptionsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Public
      { path: 'course/:courseId', element: <CourseDetailPage /> },

      // Auth pages — redirect away if already logged in
      {
        element: <GuestRoute />,
        children: [
          { path: 'login',    element: <LoginPage />    },
          { path: 'register', element: <RegisterPage /> },
        ],
      },

      // Authenticated — any logged-in user (free tier with restrictions, standard with full access)
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard',        element: <DashboardPage />    },
          { path: 'subscription',     element: <SubscriptionPage /> },
          { path: 'courses',          element: <CoursesPage />      },
          { path: 'lesson/:lessonId', element: <LessonPage />       },
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
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
