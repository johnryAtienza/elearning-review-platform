import { NavLink, Outlet, Link } from 'react-router-dom'
import { type LucideIcon, LayoutDashboard, BookOpen, Users, ChevronLeft } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.ADMIN,         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.ADMIN_COURSES, label: 'Courses',   icon: BookOpen },
  { to: ROUTES.ADMIN_USERS,   label: 'Users',     icon: Users },
]

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r bg-card hidden md:flex flex-col">
        <div className="sticky top-16 flex flex-col h-[calc(100vh-4rem)]">
          {/* Panel title */}
          <div className="px-4 py-4 border-b">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Panel
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Back to site */}
          <div className="px-3 py-3 border-t">
            <Link
              to={ROUTES.HOME}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Back to site
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden w-full absolute top-16 z-20 border-b bg-card">
        <nav className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 px-6 py-8 md:py-8 mt-10 md:mt-0">
        <Outlet />
      </main>
    </div>
  )
}
