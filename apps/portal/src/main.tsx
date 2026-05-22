import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from '@s-class/auth/authStore'
import { router } from './app/router'
import '@/index.css'

// Restore any persisted auth session before the router renders.
// On portal, an unauthenticated user gets bounced to landing.*/login by
// PortalProtectedRoute. The full subscription state is re-synced after
// initialize() resolves.
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors position="bottom-right" duration={3500} />
  </StrictMode>,
)
