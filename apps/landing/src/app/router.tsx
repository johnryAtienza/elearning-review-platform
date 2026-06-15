import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '../layouts/RootLayout'
import { HomePage } from '../pages/HomePage'
import { AboutPage } from '../pages/AboutPage'
import { ContactPage } from '../pages/ContactPage'
import { FAQPage } from '../pages/FAQPage'
import { BooksPage } from '../pages/BooksPage'
import { BookDetailPage } from '../pages/BookDetailPage'
import { DashboardPage } from '../../../portal/src/pages/DashboardPage'
import { QuizHistoryPage } from '../../../portal/src/pages/QuizHistoryPage'
import { QuizResultReviewPage } from '../../../portal/src/pages/QuizResultReviewPage'
import { PaymentSuccessPage } from '../../../portal/src/pages/PaymentSuccessPage'
import { PaymentCancelPage } from '../../../portal/src/pages/PaymentCancelPage'
import { BookCheckoutPage } from '../../../portal/src/pages/BookCheckoutPage'
import { ProfilePage } from '../../../portal/src/pages/ProfilePage'
import { DevicesPage } from '../../../portal/src/pages/DevicesPage'
import { LoginPage } from '../../../portal/src/pages/LoginPage'
import { RegisterPage } from '../../../portal/src/pages/RegisterPage'
import { ForgotPasswordPage } from '../../../portal/src/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../../portal/src/pages/ResetPasswordPage'
import { PortalSubjectsPage } from '../../../portal/src/pages/PortalSubjectsPage'
import { PortalSubjectHubPage } from '../../../portal/src/pages/PortalSubjectHubPage'
import { PortalAdminBouncer } from '../../../portal/src/components/PortalAdminBouncer'
import { PortalGuestRoute } from '../../../portal/src/components/PortalGuestRoute'
import { PortalProtectedRoute } from '../../../portal/src/components/PortalProtectedRoute'
// SubscriptionPage, SubjectDetailPage, LessonPage are intentionally shared
// (Decision B2 — see Phase 4 plan). They stay in /src/pages/ and are
// imported via the @/ alias which resolves to the repo root /src.
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { SubjectDetailPage } from '@/pages/SubjectDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { ROUTES } from '@/constants/routes'
import {
  LegacyBookCheckoutRedirect,
  LegacyLessonRedirect,
  LegacySubjectRedirect,
  RedirectPreservingLocation,
} from '@/components/LegacyPortalRedirects'

/**
 * Landing now owns the student-facing same-origin route tree:
 *   /                 Public marketing
 *   /login            Auth
 *   /portal/*         Authenticated student portal
 *
 * Keeping auth and the student portal under the landing origin lets the
 * existing Supabase localStorage session and shared auth store work naturally.
 * Admin stays separate in apps/admin and admin.s-class.com.ph.
 *
 * Public preview funnel (Phase 1 separation):
 *   /books, /book/:bookId        Public storefront (browse only; buy CTA
 *                                routes into /portal/book/:id/checkout)
 *   /pricing                     Marketing variant of /subscription
 *   /preview/subject/:subjectId  Subject overview for guests (curriculum +
 *                                "Watch Free Preview" CTA for first lesson)
 *   /preview/lesson/:lessonId    Free-preview lesson player; non-preview
 *                                lessons render a "Preview not available"
 *                                notice (no redirect, stable URL)
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Public marketing
      { path: 'about',   element: <AboutPage />   },
      { path: 'contact', element: <ContactPage /> },
      { path: 'faq',     element: <FAQPage />     },

      // Public storefront (browse only — checkout lives under /portal)
      { path: 'books',          element: <BooksPage />      },
      { path: 'book/:bookId',   element: <BookDetailPage /> },

      // Marketing pricing (upgrade flow lives under /portal/subscription)
      { path: 'pricing', element: <SubscriptionPage /> },

      // Free preview funnel
      { path: 'preview/subject/:subjectId', element: <SubjectDetailPage previewMode /> },
      { path: 'preview/lesson/:lessonId',   element: <LessonPage previewMode />        },

      {
        // Reuse the portal's existing admin bouncer for student/auth routes
        // only. Public landing pages remain accessible to every visitor.
        element: <PortalAdminBouncer />,
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
              // Payment callbacks stay public so PayMongo can land here even
              // when the user's browser session has expired.
              { path: 'payment-success', element: <PaymentSuccessPage /> },
              { path: 'payment-cancel',  element: <PaymentCancelPage />  },

              {
                element: <PortalProtectedRoute />,
                children: [
                  { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },

                  { path: 'dashboard',                 element: <DashboardPage />        },
                  { path: 'subjects',                  element: <PortalSubjectsPage />   },
                  { path: 'subjects/:subjectId',       element: <PortalSubjectHubPage /> },
                  { path: 'lessons/:lessonId',         element: <LessonPage />           },
                  { path: 'quiz-history',              element: <QuizHistoryPage />      },
                  { path: 'quiz-history/:attemptId',   element: <QuizResultReviewPage /> },
                  { path: 'subscription',              element: <SubscriptionPage />     },
                  { path: 'profile',                   element: <ProfilePage />          },
                  { path: 'profile/devices',           element: <DevicesPage />          },
                  { path: 'book/:bookId/checkout',     element: <BookCheckoutPage />     },
                ],
              },
            ],
          },

          // Compatibility redirects for pre-/portal student URLs.
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
        ],
      },

      // Anything else on this origin — back to home.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
