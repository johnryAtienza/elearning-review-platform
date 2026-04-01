import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { useAuthStore } from '@/store/authStore'
import './index.css'

// Restore any persisted auth session before the router renders.
// This prevents a flash where protected routes briefly redirect to /login
// on a hard refresh while the real session is still valid.
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors position="bottom-right" duration={3500} />
  </StrictMode>,
)
