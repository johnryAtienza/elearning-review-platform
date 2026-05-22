import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
import { FAQPage } from '@/pages/FAQPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { LandingGuestRoute } from '../components/LandingGuestRoute'

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

      // Password reset — fully public (user arrives from email without a session)
      { path: 'reset-password', element: <ResetPasswordPage /> },

      // Auth pages — bounce already-logged-in users cross-domain to portal/admin
      {
        element: <LandingGuestRoute />,
        children: [
          { path: 'login',           element: <LoginPage />           },
          { path: 'register',        element: <RegisterPage />        },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },

      // Anything else on this subdomain — back to home.
      // (Browse/lesson/checkout routes live on portal.*.)
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
