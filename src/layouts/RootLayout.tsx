import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { SiteBackground } from '@/components/SiteBackground'

/**
 * Top-level layout for the Landing app.
 *
 * Landing-only after Phase 3: Portal switched to `PortalRootLayout` (which
 * intentionally has no marketing Navbar / footer), and Admin has its own
 * `AdminLayout`. Nothing on Landing needs the previous hide-chrome heuristics
 * (Portal shell, /books, /lesson, /admin) — those surfaces aren't reachable
 * from this subdomain anymore — so this file stays deliberately small.
 */
export function RootLayout() {
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
