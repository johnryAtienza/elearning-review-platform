import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PortalLayout } from '@/layouts/PortalLayout'
import { SubjectsPage } from '../pages/SubjectsPage'
import { SubjectDetailPage } from '@/pages/SubjectDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { BookCheckoutPage } from '../pages/BookCheckoutPage'
import { DashboardPage } from '../pages/DashboardPage'
import { QuizHistoryPage } from '../pages/QuizHistoryPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
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
import { PreviewBouncer } from '../components/PreviewBouncer'

/**
 * Portal is learning-only after Phase 3.
 *
 * Removed in Phase 3:
 *   /, /about, /contact, /faq        — Landing-owned marketing
 *   /books, /book/:bookId            — Landing-owned storefront
 *   (RootLayout + PortalShellOrPublic — Landing keeps the shared marketing chrome)
 *
 * Still served here:
 *   Public  → /login, /register, /forgot-password, /reset-password
 *             /payment-success, /payment-cancel (PayMongo callbacks)
 *   Auth'd  → /dashboard, /quizzes, /subscription, /profile/*,
 *             /portal/subjects/*, /courses, /course/:id, /lesson/:id,
 *             /book/:bookId/checkout
 *
 * Guests hitting /, /courses, /course/:id, or /lesson/:id are sent to
 * /login by PortalProtectedRoute (with the original location preserved
 * in state). PreviewBouncer sits ahead of /course/:id and /lesson/:id to
 * forward guests on free-preview targets cross-origin to Landing's
 * /preview/* routes, so old bookmarks keep working.
 */
export const router = createBrowserRouter([
  {
    // Bounces any authenticated admin off portal.* to admin.* before
    // rendering the page tree below. Students and guests fall through.
    element: <PortalAdminBouncer />,
    children: [
      {
        path: '/',
        element: <PortalRootLayout />,
        children: [
          // Payment result pages — public so users can land here after
          // PayMongo redirects them back, even if the session expired mid-flow.
          { path: 'payment-success',  element: <PaymentSuccessPage /> },
          { path: 'payment-cancel',   element: <PaymentCancelPage />  },

          // Same-origin auth flows — reuse legacy pages via @ alias.
          // Wrapped in PortalGuestRoute so already-signed-in students get
          // sent to /dashboard instead of rendering the login form again.
          {
            element: <PortalGuestRoute />,
            children: [
              { path: 'login',           element: <LoginPage />          },
              { path: 'register',        element: <RegisterPage />       },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
            ],
          },

          // reset-password lives OUTSIDE PortalGuestRoute: the Supabase
          // recovery flow (/auth/v1/verify?type=recovery → redirect_to)
          // always creates an active session before this page loads, so
          // the guard would otherwise bounce the user to /dashboard before
          // they can set a new password. ResetPasswordPage handles its own
          // session detection via the PASSWORD_RECOVERY auth event.
          { path: 'reset-password', element: <ResetPasswordPage /> },

          // ── Learning routes — authenticated only. ────────────────────
          // PreviewBouncer sits ahead of /course/:id and /lesson/:id to
          // forward guests on free-preview targets back to Landing's
          // /preview/* routes before the auth guard kicks in. Authenticated
          // users skip the bouncer's async check and fall straight through.
          {
            element: <PortalProtectedRoute />,
            children: [
              { path: 'courses', element: <SubjectsPage /> },
            ],
          },
          {
            path: 'course/:courseId',
            element: <PreviewBouncer kind="subject" />,
            children: [
              {
                element: <PortalProtectedRoute />,
                children: [{ index: true, element: <SubjectDetailPage /> }],
              },
            ],
          },
          {
            path: 'lesson/:lessonId',
            element: <PreviewBouncer kind="lesson" />,
            children: [
              {
                element: <PortalProtectedRoute />,
                children: [{ index: true, element: <LessonPage /> }],
              },
            ],
          },

          // ── Authenticated portal area (sidebar shell + checkout). ────
          {
            element: <PortalProtectedRoute />,
            children: [
              // portal root → dashboard. Guests fall through the guard to
              // /login (preserving location.from), giving Portal its
              // LMS-style "the subdomain is the app" entrance.
              { index: true, element: <Navigate to="/dashboard" replace /> },

              // Pages that live inside the portal sidebar shell.
              {
                element: <PortalLayout />,
                children: [
                  { path: 'dashboard',                  element: <DashboardPage />        },
                  { path: 'quizzes',                    element: <QuizHistoryPage />      },
                  { path: 'subscription',               element: <SubscriptionPage />     },
                  { path: 'profile',                    element: <ProfilePage />          },
                  { path: 'profile/devices',            element: <DevicesPage />          },
                  { path: 'portal/subjects',            element: <PortalSubjectsPage />   },
                  { path: 'portal/subjects/:subjectId', element: <PortalSubjectHubPage /> },
                ],
              },

              // Protected routes that intentionally stay outside the portal shell.
              { path: 'book/:bookId/checkout', element: <BookCheckoutPage /> },
            ],
          },

          // Unknown route — back to portal root (authenticated → /dashboard,
          // guest → /login via PortalProtectedRoute on the index route).
          // Marketing and storefront paths are 301-redirected to Landing via
          // apps/portal/public/_redirects before this fallback ever fires.
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
