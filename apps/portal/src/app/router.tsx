import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { BooksPage } from '@/pages/BooksPage'
import { BookDetailPage } from '@/pages/BookDetailPage'
import { BookCheckoutPage } from '@/pages/BookCheckoutPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { QuizHistoryPage } from '@/pages/QuizHistoryPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { DevicesPage } from '@/pages/DevicesPage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'
import { PaymentCancelPage } from '@/pages/PaymentCancelPage'
import { PortalProtectedRoute } from '../components/PortalProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public browse (free preview enforced inside the components,
      // mirroring legacy /src router behavior)
      { path: 'courses',          element: <CoursesPage />        },
      { path: 'course/:courseId', element: <CourseDetailPage />   },
      { path: 'lesson/:lessonId', element: <LessonPage />         },
      { path: 'books',            element: <BooksPage />          },
      { path: 'book/:bookId',     element: <BookDetailPage />     },

      // Payment result pages — public so users can land here after
      // PayMongo redirects them back, even if the session expired mid-flow.
      { path: 'payment-success',  element: <PaymentSuccessPage /> },
      { path: 'payment-cancel',   element: <PaymentCancelPage />  },

      // Authenticated portal area
      {
        element: <PortalProtectedRoute />,
        children: [
          // portal root → dashboard. Keeps existing ROUTES.DASHBOARD
          // (`/dashboard`) callsites working unchanged.
          { index: true,                   element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',             element: <DashboardPage />    },
          { path: 'quizzes',               element: <QuizHistoryPage />  },
          { path: 'subscription',          element: <SubscriptionPage /> },
          { path: 'profile',               element: <ProfilePage />      },
          { path: 'profile/devices',       element: <DevicesPage />      },
          { path: 'book/:bookId/checkout', element: <BookCheckoutPage /> },
        ],
      },

      // Unknown route — back to portal root (which sends to dashboard).
      // Admin and landing routes live on other subdomains.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
