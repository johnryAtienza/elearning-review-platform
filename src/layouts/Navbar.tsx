import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, User, X, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogoutModal } from '@/components/LogoutModal'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { TAGLINE } from '@/constants/aboutCopy'
import { courseApi } from '@/services/courseApi'
import type { Course } from '@/features/courses/types'
import { cn } from '@/utils/cn'

// ── Module-level cache for the published course list ─────────────────────────
// Cached so we only fetch once per full page load even if the Navbar re-mounts.
let coursesCache: Course[] | null = null
let coursesPromise: Promise<Course[]> | null = null

function fetchPublishedCourses(): Promise<Course[]> {
  if (coursesCache) return Promise.resolve(coursesCache)
  if (coursesPromise) return coursesPromise
  coursesPromise = courseApi
    .getAll()
    .then((all) => {
      const published = all.filter((c) => c.isPublished !== false)
      coursesCache = published
      return published
    })
    .catch((err) => {
      // Don't cache failures — let the next navigation try again.
      coursesPromise = null
      throw err
    })
  return coursesPromise
}

// ── Tab styles ───────────────────────────────────────────────────────────────
// Two visual treatments are used:
//   tabClass — header tab row (Home / About / course tabs)
//   utilityLinkClass — top-row utility links (Dashboard, Admin)

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center justify-center text-sm font-medium px-4 py-2.5 rounded-t-md transition-colors whitespace-nowrap',
    isActive
      ? 'bg-card text-foreground border-b-2 border-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border-b-2 border-transparent',
  )

const utilityLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
  )

// ── User avatar ──────────────────────────────────────────────────────────────

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

// ── Profile dropdown ─────────────────────────────────────────────────────────

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

// ── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { isAuthenticated, isSubscribed, isAdmin, user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [courses, setCourses] = useState<Course[]>(() => coursesCache ?? [])

  // Fetch the published course list once for the dynamic tabs.
  useEffect(() => {
    let cancelled = false
    fetchPublishedCourses()
      .then((list) => { if (!cancelled) setCourses(list) })
      .catch(() => { /* fail silently — tabs just won't include dynamic ones */ })
    return () => { cancelled = true }
  }, [])

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

        {/* ── Top row: brand + tagline + utility/auth ── */}
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">

          {/* Brand */}
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-3 font-bold shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <img src="/elearning-logo.png" alt="CLASS S Review" className="h-10 w-auto" />
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">CLASS S</span>
              <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">Review</span>
            </span>
          </Link>

          {/* Tagline (centred on desktop) */}
          <span className="hidden lg:block text-xs italic text-muted-foreground tracking-wide">
            {TAGLINE}
          </span>

          {/* Desktop utility / auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {!isAdmin && (
                  <NavLink to={ROUTES.DASHBOARD} className={utilityLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutDashboard className="size-4" />
                      Dashboard
                    </span>
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to={ROUTES.ADMIN} className={utilityLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-4" />
                      Admin
                    </span>
                  </NavLink>
                )}
                {isSubscribed && <Badge variant="pro">Standard</Badge>}
                {!isSubscribed && !isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={ROUTES.SUBSCRIPTION}>Upgrade</Link>
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

        {/* ── Bottom row: tab nav (Home / About / course tabs) — desktop only ── */}
        <nav className="hidden md:block border-t bg-background/60">
          <div className="container mx-auto flex items-end gap-1 px-4 overflow-x-auto">
            <NavLink to={ROUTES.HOME} end className={tabClass}>Home</NavLink>
            <NavLink to={ROUTES.ABOUT} className={tabClass}>Who we are</NavLink>
            <NavLink to={ROUTES.BOOKS} className={tabClass}>Books</NavLink>
            {courses.map((c) => (
              <NavLink key={c.id} to={ROUTES.COURSE(c.id)} className={tabClass}>
                {c.title}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
            <MobileNavLink to={ROUTES.HOME} end onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
            <MobileNavLink to={ROUTES.ABOUT} onClick={() => setMobileOpen(false)}>Who we are</MobileNavLink>
            <MobileNavLink to={ROUTES.BOOKS} onClick={() => setMobileOpen(false)}>Books</MobileNavLink>
            {courses.map((c) => (
              <MobileNavLink key={c.id} to={ROUTES.COURSE(c.id)} onClick={() => setMobileOpen(false)}>
                {c.title}
              </MobileNavLink>
            ))}

            {isAuthenticated && (
              <>
                <div className="pt-2 mt-2 border-t" />
                {!isAdmin && (
                  <MobileNavLink to={ROUTES.DASHBOARD} onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="size-4 inline-block mr-1.5 -mt-0.5" />
                    Dashboard
                  </MobileNavLink>
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
