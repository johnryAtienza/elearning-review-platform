import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BookOpen, Menu, X, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-foreground relative',
    isActive
      ? 'text-foreground after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary'
      : 'text-muted-foreground',
  )

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground select-none">
      {initials}
    </span>
  )
}

export function Navbar() {
  const { isAuthenticated, isSubscribed, isAdmin, user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">

        {/* Brand */}
        <Link
          to={ROUTES.HOME}
          className="flex items-center gap-2 font-bold text-lg shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          <span>ELearn</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <NavLink to={ROUTES.HOME} end className={navLinkClass}>Home</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to={ROUTES.COURSES}   className={navLinkClass}>Courses</NavLink>
              <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>Dashboard</NavLink>
              {isAdmin && (
                <NavLink to={ROUTES.ADMIN} className={navLinkClass}>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" />
                    Admin
                  </span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {isSubscribed ? (
                <Badge variant="pro">Pro</Badge>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Pro</Link>
                </Button>
              )}
              <div className="flex items-center gap-2">
                {user && <UserAvatar name={user.name} />}
                <span className="text-sm font-medium hidden lg:block">{user?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link to={ROUTES.LOGIN}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to={ROUTES.REGISTER}>Sign up free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
          <MobileNavLink to={ROUTES.HOME} end onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
          {isAuthenticated && (
            <>
              <MobileNavLink to={ROUTES.COURSES}   onClick={() => setMobileOpen(false)}>Courses</MobileNavLink>
              <MobileNavLink to={ROUTES.DASHBOARD} onClick={() => setMobileOpen(false)}>Dashboard</MobileNavLink>
              {isAdmin && (
                <MobileNavLink to={ROUTES.ADMIN} onClick={() => setMobileOpen(false)}>
                  <ShieldCheck className="size-4 inline-block mr-1.5 -mt-0.5" />
                  Admin
                </MobileNavLink>
              )}
            </>
          )}
          <div className="pt-3 border-t mt-3 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 py-1">
                  {user && <UserAvatar name={user.name} />}
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  {isSubscribed && <Badge variant="pro" className="ml-auto">Pro</Badge>}
                </div>
                {!isSubscribed && (
                  <Button asChild className="w-full" size="sm">
                    <Link to={ROUTES.SUBSCRIPTION} onClick={() => setMobileOpen(false)}>Upgrade to Pro</Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" size="sm" onClick={() => { logout(); setMobileOpen(false) }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full" size="sm">
                  <Link to={ROUTES.REGISTER} onClick={() => setMobileOpen(false)}>Sign up free</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)}>Log in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MobileNavLink({
  to,
  end,
  onClick,
  children,
}: {
  to: string
  end?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {children}
    </NavLink>
  )
}
