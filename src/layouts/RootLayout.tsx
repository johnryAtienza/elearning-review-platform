import { Outlet, useMatch } from 'react-router-dom'
import { Navbar } from './Navbar'
import { SiteBackground } from '@/components/SiteBackground'

export function RootLayout() {
  const onAdminRoute = useMatch('/admin/*') !== null

  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteBackground />
      {!onAdminRoute && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!onAdminRoute && (
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ELearn. All rights reserved.
        </footer>
      )}
    </div>
  )
}
