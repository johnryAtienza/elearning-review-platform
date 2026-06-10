import { Outlet } from 'react-router-dom'
import { SiteBackground } from '@/components/SiteBackground'

/**
 * Top-level layout for the Portal app.
 *
 * Portal is learning-only after Phase 3 — no marketing Navbar, no marketing
 * footer, no Home/About/Books/FAQ/Contact tabs. Auth pages and payment
 * callbacks render bare here. Protected routes wrap themselves in
 * `PortalLayout` (the dashboard sidebar shell) inside the router, so they
 * never see this layer beyond the background.
 *
 * Landing keeps using the shared `src/layouts/RootLayout.tsx` for its
 * marketing chrome — this file is intentionally Portal-only.
 */
export function PortalRootLayout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteBackground />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
