import { Outlet, useMatch } from 'react-router-dom'
import { Navbar } from './Navbar'
import { SiteBackground } from '@/components/SiteBackground'
import { usePortalShellMatch } from './PortalLayout'
import { useAuthStore } from '@/store/authStore'

export function RootLayout() {
  const onAdminRoute  = useMatch('/admin/*') !== null
  const onPortalRoute = usePortalShellMatch()
  const onBooksRoute  =
    useMatch('/books') !== null || useMatch('/book/:bookId') !== null
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Hide public chrome when:
  //   - inside the admin shell, or
  //   - inside the student portal shell, or
  //   - on /books or /book/:id while signed in (PortalShellOrPublic wraps these
  //     in PortalLayout for authenticated users — without this guard the public
  //     Navbar would stack on top of the portal sidebar).
  const hideShell = onAdminRoute || onPortalRoute || (onBooksRoute && isAuthenticated)

  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteBackground />
      {!hideShell && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideShell && (
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ELearn. All rights reserved.
        </footer>
      )}
    </div>
  )
}
