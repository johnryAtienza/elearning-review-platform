import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
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
