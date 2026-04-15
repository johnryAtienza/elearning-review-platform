import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, User, X, ShieldCheck, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogoutModal } from '@/components/LogoutModal'
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

// ── Profile dropdown ──────────────────────────────────────────────────────────

interface ProfileDropdownProps {
  name: string
  email: string
  onLogout: () => void
}

function ProfileDropdown({ name, email, onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleViewProfile() {
    setOpen(false)
    navigate(ROUTES.PROFILE)
  }

  function handleLogout() {
    setOpen(false)
    onLogout()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <UserAvatar name={name} />
        <span className="text-sm font-medium hidden lg:block">{name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border bg-card shadow-lg z-50 overflow-hidden"
        >
          {/* Identity header */}
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              role="menuitem"
              onClick={handleViewProfile}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <User className="size-4 shrink-0 text-muted-foreground" />
              View Profile
            </button>
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left text-destructive hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar() {
  const { isAuthenticated, isSubscribed, isAdmin, user, logout } = useAuthStore()
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  function handleLogoutClick() {
    setMobileOpen(false)
    setShowLogoutModal(true)
  }

  function handleLogoutConfirm() {
    setShowLogoutModal(false)
    logout()
  }

  return (
    <>
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">

          {/* Brand */}
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 font-bold text-lg shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <img src="/elearning-logo.png" alt="E-Learn" className="h-[50px] md:h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to={ROUTES.HOME} end className={navLinkClass}>Home</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to={ROUTES.COURSES} className={navLinkClass}>Courses</NavLink>
                {!isAdmin && (
                  <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>Dashboard</NavLink>
                )}
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
                {isSubscribed && <Badge variant="pro">Standard</Badge>}
                {!isSubscribed && !isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Standard</Link>
                  </Button>
                )}
                {user && (
                  <ProfileDropdown
                    name={user.name}
                    email={user.email}
                    onLogout={handleLogoutClick}
                  />
                )}
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
            {mobileOpen ? <X className="size-7" /> : <Menu className="size-7" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
            <MobileNavLink to={ROUTES.HOME} end onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
            {isAuthenticated && (
              <>
                <MobileNavLink to={ROUTES.COURSES} onClick={() => setMobileOpen(false)}>Courses</MobileNavLink>
                {!isAdmin && (
                  <MobileNavLink to={ROUTES.DASHBOARD} onClick={() => setMobileOpen(false)}>Dashboard</MobileNavLink>
                )}
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
                    {isSubscribed && <Badge variant="pro" className="ml-auto">Standard</Badge>}
                  </div>
                  {!isSubscribed && !isAdmin && (
                    <Button asChild className="w-full" size="sm">
                      <Link to={ROUTES.SUBSCRIPTION} onClick={() => setMobileOpen(false)}>Upgrade to Standard</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link to={ROUTES.PROFILE} onClick={() => setMobileOpen(false)}>
                      <User className="size-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" size="sm" onClick={handleLogoutClick}>
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
    </>
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
