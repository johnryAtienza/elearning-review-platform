import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { SiteBackground } from '@/components/SiteBackground'
import { useAuthStore } from '@/store/authStore'

/**
 * Local boolean subscription to auth.isAuthenticated.
 *
 * Intentionally bypasses zustand's `useStore` hook. RootLayout is the only
 * persistent root-level layout in the app; running zustand's `useStore`
 * (and React Router's `useMatch`) here exposes a React-19 hook-fiber
 * tracking issue that manifests as
 * `Cannot read properties of undefined (reading 'length')` inside
 * `areHookInputsEqual` on cross-route remount.
 *
 * Using `useState` + `useEffect` against zustand's vanilla `subscribe` API
 * uses the standard React hook path and keeps RootLayout's hook surface
 * minimal. Initial value comes from `getState()` synchronously so the
 * first render is correct.
 *
 * RootLayout is the only place that needs this workaround — every other
 * component mounts/unmounts with its route and is unaffected.
 */
function useAuthIsAuthenticated(): boolean {
  const [value, setValue] = useState(() => useAuthStore.getState().isAuthenticated)
  useEffect(() => {
    // Sync once on mount in case the store changed between initial render and subscribe.
    setValue(useAuthStore.getState().isAuthenticated)
    return useAuthStore.subscribe((state) => setValue(state.isAuthenticated))
  }, [])
  return value
}

// Pathname matchers — kept as plain functions so RootLayout doesn't have to
// call multiple `useMatch` hooks. Each `useMatch` adds ~3 internal React
// hooks (two useContext + one useMemo), and the cumulative hook count in a
// persistent root-level layout has surfaced React-19 reconciler issues.
function isPortalShellPath(pathname: string): boolean {
  return (
    pathname === '/dashboard'
    || pathname === '/quizzes'
    || pathname === '/subscription'
    || pathname === '/profile'
    || pathname.startsWith('/profile/')
    || pathname === '/portal'
    || pathname.startsWith('/portal/')
  )
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isBooksPath(pathname: string): boolean {
  // Matches /books, /book/:id, /book/:id/checkout — same surface as
  // useMatch('/books') || useMatch('/book/:bookId').
  return pathname === '/books' || pathname.startsWith('/book/')
}

function isLessonPath(pathname: string): boolean {
  // Matches /lesson/:lessonId — same surface as useMatch('/lesson/:lessonId').
  return pathname.startsWith('/lesson/')
}

export function RootLayout() {
  const { pathname }    = useLocation()
  const isAuthenticated = useAuthIsAuthenticated()

  const onAdminRoute  = isAdminPath(pathname)
  const onPortalRoute = isPortalShellPath(pathname)
  const onBooksRoute  = isBooksPath(pathname)
  const onLessonRoute = isLessonPath(pathname)

  // Hide public chrome when:
  //   - inside the admin shell, or
  //   - inside the student portal shell, or
  //   - on /books or /book/:id while signed in (PortalShellOrPublic wraps these
  //     in PortalLayout for authenticated users — without this guard the public
  //     Navbar would stack on top of the portal sidebar), or
  //   - on /lesson/:id while signed in. The lesson page is intentionally NOT
  //     wrapped in PortalLayout (video real estate) but it has its own sticky
  //     top bar + course-content sidebar + breadcrumb — the marketing Navbar
  //     would just be redundant chrome inside the learning experience.
  //     Guests still see the Navbar on lessons (free-preview access path).
  const hideShell = onAdminRoute
                  || onPortalRoute
                  || ((onBooksRoute || onLessonRoute) && isAuthenticated)

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
