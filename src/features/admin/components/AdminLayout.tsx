import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  ClipboardList,
  Users,
  CreditCard,
  Tag,
  ChevronLeft,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: ROUTES.ADMIN,               label: 'Dashboard',     icon: LayoutDashboard, end: true  },
  { to: ROUTES.ADMIN_COURSES,       label: 'Courses',       icon: BookOpen,        end: false },
  { to: ROUTES.ADMIN_CATEGORIES,    label: 'Categories',    icon: Tag,             end: false },
  { to: ROUTES.ADMIN_LESSONS,       label: 'Lessons',       icon: BookMarked,      end: false },
  { to: ROUTES.ADMIN_QUIZZES,       label: 'Quizzes',       icon: ClipboardList,   end: false },
  { to: ROUTES.ADMIN_USERS,         label: 'Users',         icon: Users,           end: false },
  { to: ROUTES.ADMIN_SUBSCRIPTIONS, label: 'Subscriptions', icon: CreditCard,      end: false },
] as const

// ── Route label map for header breadcrumb ────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  [ROUTES.ADMIN]:               'Dashboard',
  [ROUTES.ADMIN_COURSES]:       'Courses',
  [ROUTES.ADMIN_CATEGORIES]:    'Categories',
  [ROUTES.ADMIN_LESSONS]:       'Lessons',
  [ROUTES.ADMIN_QUIZZES]:       'Quizzes',
  [ROUTES.ADMIN_USERS]:         'Users',
  [ROUTES.ADMIN_SUBSCRIPTIONS]: 'Subscriptions',
}

function usePageTitle(): string {
  const { pathname } = useLocation()
  return ROUTE_LABELS[pathname] ?? 'Admin'
}

// ── Sidebar link ──────────────────────────────────────────────────────────────

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  onClick,
}: {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          collapsed ? 'justify-center' : '',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

// ── Main layout ───────────────────────────────────────────────────────────────

export function AdminLayout() {
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const { user } = useAuthStore()
  const pageTitle = usePageTitle()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A'

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed top-16 inset-x-0 bottom-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-card transition-all duration-200',
          'sticky top-16 self-start h-[calc(100vh-4rem)]',
          collapsed ? 'w-[60px]' : 'w-60',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          initials={initials}
          userName={user?.name}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* ── Mobile slide-in sidebar ── */}
      <aside
        className={cn(
          'fixed top-16 bottom-0 left-0 z-40 flex flex-col w-64 border-r bg-card transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <SidebarLink
              key={to}
              to={to}
              label={label}
              icon={icon}
              end={end}
              collapsed={false}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        <div className="px-3 py-3 border-t">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <ChevronLeft className="size-3.5" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* ── Right side: header + content ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/60 px-4">
          {/* Mobile: hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>

          {/* Desktop: collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hidden md:flex"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="size-4" />
          </Button>

          {/* Page title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:block">Admin</span>
            <span className="text-xs text-muted-foreground hidden sm:block">/</span>
            <h1 className="text-sm font-semibold truncate">{pageTitle}</h1>
          </div>

          {/* Right: user info */}
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground hidden lg:block">{user?.name}</span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground select-none">
              {initials}
            </span>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Desktop sidebar content (shared between normal and collapsed states) ──────

function SidebarContent({
  collapsed,
  initials,
  userName,
  onToggleCollapse,
}: {
  collapsed: boolean
  initials: string
  userName?: string
  onToggleCollapse: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand area */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-4 border-b',
          collapsed ? 'justify-center px-2' : '',
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-4" />
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold">Admin Panel</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <SidebarLink
            key={to}
            to={to}
            label={label}
            icon={icon}
            end={end}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User + back to site */}
      <div className="px-3 py-3 border-t space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary select-none">
              {initials}
            </span>
            <span className="text-xs font-medium truncate">{userName}</span>
          </div>
        )}
        <Link
          to={ROUTES.HOME}
          title={collapsed ? 'Back to site' : undefined}
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-1 py-1',
            collapsed ? 'justify-center' : '',
          )}
        >
          <ChevronLeft className="size-3.5 shrink-0" />
          {!collapsed && <span>Back to site</span>}
        </Link>
      </div>
    </div>
  )
}
