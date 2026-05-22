import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from '@s-class/auth/authStore'
import { router } from './app/router'
import '@/index.css'

// Restore any persisted auth session before the router renders.
// On admin.*, an unauthenticated visitor is sent to /login (same origin);
// a non-admin authenticated user gets bounced cross-domain to portal.*.
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors position="bottom-right" duration={3500} />
  </StrictMode>,
)
