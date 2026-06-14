import { Outlet } from 'react-router-dom'
import { Navbar } from '@/layouts/Navbar'
import { SiteBackground } from '@/components/SiteBackground'

/**
 * Top-level layout for the Portal app.
 *
 * Portal is learning-only after Phase 3, but it now uses the same public-site
 * chrome as Landing: shared Navbar, dark blueprint background, normal document
 * scroll, and footer. Auth guards and route ownership remain Portal-specific.
 */
export function PortalRootLayout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteBackground />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ELearn. All rights reserved.
      </footer>
    </div>
  )
}
