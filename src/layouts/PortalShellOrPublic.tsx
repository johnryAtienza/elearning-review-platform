import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PortalLayout } from './PortalLayout'

// Hoisted selector — stable reference; see RootLayout.tsx for rationale.
const selectIsAuthenticated = (s: { isAuthenticated: boolean }) => s.isAuthenticated

/**
 * Renders the page inside PortalLayout for authenticated users, otherwise
 * renders the page bare so it appears inside the public RootLayout chrome.
 * Used for routes (currently /books, /book/:bookId) that exist for both
 * guests and members but should feel like part of the portal once signed in.
 */
export function PortalShellOrPublic({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  if (isAuthenticated) {
    return <PortalLayout>{children}</PortalLayout>
  }
  return <>{children}</>
}
