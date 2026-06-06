import { useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  useMatch,
  useNavigate,
  type NavLinkProps,
} from 'react-router-dom'
import { Menu, User, X, ShieldCheck, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoutModal } from '@/components/LogoutModal'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { subjectApi } from '@/services/subjectApi'
import type { Subject } from '@/features/subjects/types'
import { cn } from '@/utils/cn'
import {
  getAbsoluteUrl,
  getCurrentSubdomain,
  getRouteOwner,
} from '@s-class/constants/urls'

// ── Module-level cache for the published subject list ────────────────────────
// Cached so we only fetch once per full page load even if the Navbar re-mounts.
let subjectsCache: Subject[] | null = null
let subjectsPromise: Promise<Subject[]> | null = null

function fetchPublishedSubjects(): Promise<Subject[]> {
  if (subjectsCache) return Promise.resolve(subjectsCache)
  if (subjectsPromise) return subjectsPromise
  subjectsPromise = subjectApi
    .getAll()
    .then((all: Subject[]) => {
      const published = all.filter((s: Subject) => s.isPublished !== false)
      subjectsCache = published
      return published
    })
    .catch((err: unknown) => {
      // Don't cache failures — let the next navigation try again.
      subjectsPromise = null
      throw err
    })
  return subjectsPromise
}

// ── Smart link components ────────────────────────────────────────────────────
//
// On the route's owning subdomain → react-router <Link>/<NavLink> (no reload).
// On any other subdomain → full-page <a href> to the absolute cross-origin URL.
// The current subdomain is detected once at module load via the hostname.

const CURRENT_SUBDOMAIN = getCurrentSubdomain()

function isSameOrigin(to: string): boolean {
  return getRouteOwner(to) === CURRENT_SUBDOMAIN
}

type SmartLinkProps = {
  to: string
  className?: string
  onClick?: () => void
  children: React.ReactNode
}

function SmartLink({ to, className, onClick, children }: SmartLinkProps) {
  if (isSameOrigin(to)) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={getAbsoluteUrl(to)} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

type SmartNavLinkProps = {
  to: string
  end?: boolean
  onClick?: () => void
  className: NavLinkProps['className']
  children: React.ReactNode
}

function SmartNavLink({ to, end, onClick, className, children }: SmartNavLinkProps) {
  if (isSameOrigin(to)) {
    return (
      <NavLink to={to} end={end} onClick={onClick} className={className}>
        {children}
      </NavLink>
    )
  }
  // Cross-origin: no isActive concept. Resolve className with isActive=false.
  const resolved =
    typeof className === 'function'
      ? className({ isActive: false, isPending: false, isTransitioning: false })
      : className
  return (
    <a href={getAbsoluteUrl(to)} className={resolved ?? undefined} onClick={onClick}>
      {children}
    </a>
  )
}

/** Smart programmatic navigate. Uses react-router on same-origin; full-page on cross-origin. */
function useSmartNavigate(): (to: string) => void {
  const navigate = useNavigate()
  return (to: string) => {
    if (isSameOrigin(to)) {
      navigate(to)
    } else {
      window.location.href = getAbsoluteUrl(to)
    }
  }
}

// ── Tab styles ───────────────────────────────────────────────────────────────
// Two visual treatments are used:
//   tabClass — header tab row (Home / About / course tabs)
//   utilityLinkClass — top-row utility links (Dashboard, Admin)

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center justify-center text-sm font-medium px-4 py-2.5 rounded-t-lg transition-all duration-150 whitespace-nowrap',
    isActive
      ? 'bg-card text-primary border-b-2 border-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-primary/15 border-b-2 border-transparent',
  )

const utilityLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
  )

// ── Dismissable behavior (outside click + Escape) ────────────────────────────

function useDismissable<T extends HTMLElement>(
  open: boolean,
  close: () => void,
  ref: React.RefObject<T | null>,
) {
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, ref])
}

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
  const smartNavigate = useSmartNavigate()

  useDismissable(open, () => setOpen(false), containerRef)

  function handleViewProfile() {
    setOpen(false)
    smartNavigate(ROUTES.PROFILE)
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

// ── Subjects dropdown (desktop tab) ──────────────────────────────────────────

function SubjectsDropdown({ subjects, loading }: { subjects: Subject[]; loading: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const onCourseRoute = useMatch('/course/:courseId')

  useDismissable(open, () => setOpen(false), ref)

  if (!loading && subjects.length === 0) return null

  const isActive = open || onCourseRoute !== null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-t-lg whitespace-nowrap',
          'transition-all duration-150 border-b-2',
          isActive
            ? 'bg-card text-primary border-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-primary/15 border-transparent',
        )}
      >
        Subjects
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 min-w-56 max-h-[70vh] overflow-y-auto rounded-xl border bg-card shadow-lg z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {loading ? (
            <div aria-busy="true" aria-live="polite" className="space-y-1.5 p-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-36" />
            </div>
          ) : (
            subjects.map((s) => (
              <SmartLink
                key={s.id}
                to={ROUTES.SUBJECT(s.id)}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
              >
                {s.title}
              </SmartLink>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Subjects section (mobile, collapsible) ───────────────────────────────────

function MobileSubjectsSection({
  subjects,
  loading,
  onNavigate,
}: {
  subjects: Subject[]
  loading: boolean
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)

  if (!loading && subjects.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
      >
        <span>Subjects</span>
        <ChevronDown
          className={cn('size-4 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-border space-y-0.5">
          {loading ? (
            <div aria-busy="true" aria-live="polite" className="space-y-1.5 py-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-28" />
            </div>
          ) : (
            subjects.map((s) => (
              <SmartLink
                key={s.id}
                to={ROUTES.SUBJECT(s.id)}
                onClick={onNavigate}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
              >
                {s.title}
              </SmartLink>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { isAuthenticated, isSubscribed, isAdmin, user, logout } = useAuthStore()
  const onAdminRoute = useMatch('/admin/*') !== null
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>(() => subjectsCache ?? [])
  const [loading, setLoading] = useState<boolean>(() => subjectsCache === null)

  // Fetch the published subject list once for the dynamic tabs.
  useEffect(() => {
    if (subjectsCache) return
    let cancelled = false
    fetchPublishedSubjects()
      .then((list) => {
        if (!cancelled) {
          setSubjects(list)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
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
          <SmartLink
            to={ROUTES.HOME}
            className="flex items-center gap-3 font-bold shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <img src="/elearning-logo.png" alt="S Class Review" className="h-10 w-auto" />
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">S Class</span>
              <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">Review</span>
            </span>
          </SmartLink>

          {/* Desktop utility / auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {!isAdmin && (
                  <SmartNavLink to={ROUTES.DASHBOARD} className={utilityLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutDashboard className="size-4" />
                      Dashboard
                    </span>
                  </SmartNavLink>
                )}
                {isAdmin && (
                  <SmartNavLink to={ROUTES.ADMIN} className={utilityLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-4" />
                      Admin
                    </span>
                  </SmartNavLink>
                )}
                {isSubscribed && <Badge variant="pro">Standard</Badge>}
                {!isSubscribed && !isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <SmartLink to={ROUTES.SUBSCRIPTION}>Upgrade</SmartLink>
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
                  <SmartLink to={ROUTES.LOGIN}>Log in</SmartLink>
                </Button>
                <Button asChild size="sm">
                  <SmartLink to={ROUTES.REGISTER}>Enroll Now</SmartLink>
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
        {/* Hidden on admin routes so the admin panel isn't cluttered with public-site nav. */}
        <nav className={cn('hidden border-t bg-background/60', !onAdminRoute && 'md:block')}>
          <div className="container mx-auto flex items-end justify-center gap-1.5 px-4">
            <SmartNavLink to={ROUTES.HOME} end className={tabClass}>Home</SmartNavLink>
            <SmartNavLink to={ROUTES.ABOUT} className={tabClass}>Who we are</SmartNavLink>
            <SmartNavLink to={ROUTES.BOOKS} className={tabClass}>Books</SmartNavLink>
            <SubjectsDropdown subjects={subjects} loading={loading} />
            <SmartNavLink to={ROUTES.FAQ}     className={tabClass}>FAQ</SmartNavLink>
            <SmartNavLink to={ROUTES.CONTACT} className={tabClass}>Contact</SmartNavLink>
          </div>
        </nav>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
            <MobileNavLink to={ROUTES.HOME} end onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
            <MobileNavLink to={ROUTES.ABOUT} onClick={() => setMobileOpen(false)}>Who we are</MobileNavLink>
            <MobileNavLink to={ROUTES.BOOKS} onClick={() => setMobileOpen(false)}>Books</MobileNavLink>
            <MobileSubjectsSection
              subjects={subjects}
              loading={loading}
              onNavigate={() => setMobileOpen(false)}
            />
            <MobileNavLink to={ROUTES.FAQ}     onClick={() => setMobileOpen(false)}>FAQ</MobileNavLink>
            <MobileNavLink to={ROUTES.CONTACT} onClick={() => setMobileOpen(false)}>Contact</MobileNavLink>

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
                      <SmartLink to={ROUTES.SUBSCRIPTION} onClick={() => setMobileOpen(false)}>Upgrade to Standard</SmartLink>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <SmartLink to={ROUTES.PROFILE} onClick={() => setMobileOpen(false)}>
                      <User className="size-4 mr-2" />
                      View Profile
                    </SmartLink>
                  </Button>
                  <Button variant="outline" className="w-full" size="sm" onClick={handleLogoutClick}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full" size="sm">
                    <SmartLink to={ROUTES.REGISTER} onClick={() => setMobileOpen(false)}>Enroll Now</SmartLink>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <SmartLink to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)}>Log in</SmartLink>
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
    <SmartNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-primary/15 hover:text-foreground'
        )
      }
    >
      {children}
    </SmartNavLink>
  )
}
