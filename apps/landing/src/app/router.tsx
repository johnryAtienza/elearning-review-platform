import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
import { FAQPage } from '@/pages/FAQPage'
import { RedirectToPortal } from '../components/RedirectToPortal'

/**
 * Landing is pure marketing. All auth flows (login, register, password
 * recovery) live on portal.* — landing's /login, /register, etc. just
 * cross-origin redirect there so the session lands on the right origin.
 *
 * This avoids the "double login" problem under separate-sessions-per-
 * subdomain: a form on landing would create a session on landing.* that
 * portal.* can't see, forcing the user to log in again.
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

      // Auth flows — hand off to portal (same-origin auth happens there).
      // Query strings + hash (e.g. password-reset tokens) are preserved.
      { path: 'login',            element: <RedirectToPortal path="/login" />            },
      { path: 'register',         element: <RedirectToPortal path="/register" />         },
      { path: 'forgot-password',  element: <RedirectToPortal path="/forgot-password" />  },
      { path: 'reset-password',   element: <RedirectToPortal path="/reset-password" />   },

      // Anything else on this subdomain — back to home.
      // (Browse/lesson/checkout routes live on portal.*.)
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
