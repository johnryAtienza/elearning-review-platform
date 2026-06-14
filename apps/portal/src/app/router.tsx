import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LessonPage } from '@/pages/LessonPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { ROUTES } from '@/constants/routes'
import { BookCheckoutPage } from '../pages/BookCheckoutPage'
import { DashboardPage } from '../pages/DashboardPage'
import { QuizHistoryPage } from '../pages/QuizHistoryPage'
import { ProfilePage } from '../pages/ProfilePage'
import { DevicesPage } from '../pages/DevicesPage'
import { PaymentSuccessPage } from '../pages/PaymentSuccessPage'
import { PaymentCancelPage } from '../pages/PaymentCancelPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { PortalSubjectsPage } from '../pages/PortalSubjectsPage'
import { PortalSubjectHubPage } from '../pages/PortalSubjectHubPage'
import { PortalRootLayout } from '../layouts/PortalRootLayout'
import { PortalProtectedRoute } from '../components/PortalProtectedRoute'
import { PortalGuestRoute } from '../components/PortalGuestRoute'
import { PortalAdminBouncer } from '../components/PortalAdminBouncer'
import {
  LegacyBookCheckoutRedirect,
  LegacyLessonRedirect,
  LegacySubjectRedirect,
  RedirectPreservingLocation,
} from '@/components/LegacyPortalRedirects'

/**
 * Portal route tree.
 *
 * Normal student access now runs same-origin from the landing app:
 *   s-class.com.ph/login
 *   s-class.com.ph/portal
 *
 * This standalone app keeps the same paths for local development and for any
 * temporary legacy deployment while links move to the apex origin.
 */
export const router = createBrowserRouter([
  {
    // Bounces any authenticated admin off student portal routes before
    // rendering the page tree below. Students and guests fall through.
    element: <PortalAdminBouncer />,
    children: [
      {
        path: '/',
        element: <PortalRootLayout />,
        children: [
          {
            element: <PortalGuestRoute />,
            children: [
              { path: 'login',           element: <LoginPage />          },
              { path: 'register',        element: <RegisterPage />       },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
            ],
          },

          // Supabase recovery creates a session before rendering this route;
          // ResetPasswordPage handles the PASSWORD_RECOVERY event itself.
          { path: 'reset-password', element: <ResetPasswordPage /> },

          {
            path: 'portal',
            children: [
              // Payment result pages stay public so PayMongo can land here
              // even if the user's browser session has expired.
              { path: 'payment-success', element: <PaymentSuccessPage /> },
              { path: 'payment-cancel',  element: <PaymentCancelPage />  },

              {
                element: <PortalProtectedRoute />,
                children: [
                  { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },

                  { path: 'dashboard',             element: <DashboardPage />        },
                  { path: 'subjects',              element: <PortalSubjectsPage />   },
                  { path: 'subjects/:subjectId',   element: <PortalSubjectHubPage /> },
                  { path: 'lessons/:lessonId',     element: <LessonPage />           },
                  { path: 'quiz-history',          element: <QuizHistoryPage />      },
                  { path: 'subscription',          element: <SubscriptionPage />     },
                  { path: 'profile',               element: <ProfilePage />          },
                  { path: 'profile/devices',       element: <DevicesPage />          },
                  { path: 'book/:bookId/checkout', element: <BookCheckoutPage />     },
                ],
              },
            ],
          },

          // Compatibility redirects for pre-/portal student URLs.
          {
            element: <PortalProtectedRoute />,
            children: [
              { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
            ],
          },
          { path: 'dashboard',        element: <RedirectPreservingLocation to={ROUTES.DASHBOARD} />       },
          { path: 'quizzes',          element: <RedirectPreservingLocation to={ROUTES.QUIZ_HISTORY} />    },
          { path: 'subscription',     element: <RedirectPreservingLocation to={ROUTES.SUBSCRIPTION} />    },
          { path: 'profile',          element: <RedirectPreservingLocation to={ROUTES.PROFILE} />         },
          { path: 'profile/devices',  element: <RedirectPreservingLocation to={ROUTES.DEVICES} />         },
          { path: 'courses',          element: <RedirectPreservingLocation to={ROUTES.PORTAL_SUBJECTS} /> },
          { path: 'course/:courseId', element: <LegacySubjectRedirect />                                  },
          { path: 'lesson/:lessonId', element: <LegacyLessonRedirect />                                   },
          { path: 'payment-success',  element: <RedirectPreservingLocation to={ROUTES.PAYMENT_SUCCESS} /> },
          { path: 'payment-cancel',   element: <RedirectPreservingLocation to={ROUTES.PAYMENT_CANCEL} />  },
          { path: 'book/:bookId/checkout', element: <LegacyBookCheckoutRedirect />                        },

          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
