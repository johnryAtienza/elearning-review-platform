import { Outlet } from 'react-router-dom'
import { Navbar } from '@/layouts/Navbar'
import { SiteBackground } from '@/components/SiteBackground'

/**
 * Top-level layout for the Landing app.
 *
 * Landing owns the marketing route tree. The website chrome itself is shared
 * with Portal via `src/layouts/Navbar.tsx`; Admin keeps its own layout.
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
