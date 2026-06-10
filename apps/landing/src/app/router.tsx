import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '../layouts/RootLayout'
import { HomePage } from '../pages/HomePage'
import { AboutPage } from '../pages/AboutPage'
import { ContactPage } from '../pages/ContactPage'
import { FAQPage } from '../pages/FAQPage'
import { BooksPage } from '../pages/BooksPage'
import { BookDetailPage } from '../pages/BookDetailPage'
// SubscriptionPage, SubjectDetailPage, LessonPage are intentionally shared
// (Decision B2 — see Phase 4 plan). They stay in /src/pages/ and are
// imported via the @/ alias which resolves to the repo root /src.
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { SubjectDetailPage } from '@/pages/SubjectDetailPage'
import { LessonPage } from '@/pages/LessonPage'
import { RedirectToPortal } from '../components/RedirectToPortal'

/**
 * Landing is pure marketing. All auth flows (login, register, password
 * recovery) live on portal.* — landing's /login, /register, etc. just
 * cross-origin redirect there so the session lands on the right origin.
 *
 * This avoids the "double login" problem under separate-sessions-per-
 * subdomain: a form on landing would create a session on landing.* that
 * portal.* can't see, forcing the user to log in again.
 *
 * Public preview funnel (Phase 1 separation):
 *   /books, /book/:bookId        Public storefront (browse only; buy CTA
 *                                cross-origin to portal /book/:id/checkout)
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

      // Public storefront (browse only — checkout lives on portal)
      { path: 'books',          element: <BooksPage />      },
      { path: 'book/:bookId',   element: <BookDetailPage /> },

      // Marketing pricing (CTAs cross-origin to portal /register or /subscription)
      { path: 'pricing', element: <SubscriptionPage /> },

      // Free preview funnel
      { path: 'preview/subject/:subjectId', element: <SubjectDetailPage previewMode /> },
      { path: 'preview/lesson/:lessonId',   element: <LessonPage previewMode />        },

      // Auth flows — hand off to portal (same-origin auth happens there).
      // Query strings + hash (e.g. password-reset tokens) are preserved.
      { path: 'login',            element: <RedirectToPortal path="/login" />            },
      { path: 'register',         element: <RedirectToPortal path="/register" />         },
      { path: 'forgot-password',  element: <RedirectToPortal path="/forgot-password" />  },
      { path: 'reset-password',   element: <RedirectToPortal path="/reset-password" />   },

      // Anything else on this subdomain — back to home.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
