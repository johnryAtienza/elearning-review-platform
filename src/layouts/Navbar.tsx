import { useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useMatch,
  useNavigate,
  type NavLinkProps,
} from 'react-router-dom'
import {
  Award,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  ShieldCheck,
  User,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoutModal } from '@/components/LogoutModal'
import { useAuthStore } from '@s-class/auth/authStore'
import { ROUTES } from '@/constants/routes'
import { subjectApi } from '@/services/subjectApi'
import { getPublishedCourses } from '@s-class/api/coursesApi'
import type { Subject } from '@/features/subjects/types'
import type { Course } from '@s-class/types/courses'
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
let coursesCache: Course[] | null = null
let coursesPromise: Promise<Course[]> | null = null

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

function fetchPublishedCourses(): Promise<Course[]> {
  if (coursesCache) return Promise.resolve(coursesCache)
  if (coursesPromise) return coursesPromise
  coursesPromise = getPublishedCourses()
    .then((all: Course[]) => {
      const published = all.filter((c: Course) => c.status === 'published')
      coursesCache = published
      return published
    })
    .catch((err: unknown) => {
      // Don't cache failures — let the next navigation try again.
      coursesPromise = null
      throw err
    })
  return coursesPromise
}

const MECHANICAL_ENGINEERING_SUBJECTS = [
  'Engineering Mathematics',
  'Machine Design',
  'Power and Industrial Plant Engineering',
] as const

type CourseNavChild = {
  title: string
  subject?: Subject
}

function normalizeCourseNavTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildMechanicalEngineeringChildren(subjects: Subject[]): CourseNavChild[] {
  const subjectsByTitle = new Map(
    subjects.map((subject) => [normalizeCourseNavTitle(subject.title), subject]),
  )

  return MECHANICAL_ENGINEERING_SUBJECTS.map((title) => ({
    title,
    subject: subjectsByTitle.get(normalizeCourseNavTitle(title)),
  }))
}

function findPublishedCourse(courses: Course[], name: string): Course | undefined {
  const normalizedName = normalizeCourseNavTitle(name)
  return courses.find(
    (course) =>
      course.status === 'published' &&
      normalizeCourseNavTitle(course.name) === normalizedName,
  )
}

// ── Smart link components ────────────────────────────────────────────────────
//
// On the route's owning origin -> react-router <Link>/<NavLink> (no reload).
// On any other origin -> full-page <a href> to the absolute cross-origin URL.
// The current origin is detected once at module load.

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
  showStudentItems: boolean
  onLogout: () => void
}

function ProfileDropdown({ name, email, showStudentItems, onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const smartNavigate = useSmartNavigate()

  useDismissable(open, () => setOpen(false), containerRef)

  function handleViewProfile() {
    setOpen(false)
    smartNavigate(ROUTES.PROFILE)
  }

  function handleDevices() {
    setOpen(false)
    smartNavigate(ROUTES.DEVICES)
  }

  function handleSubscription() {
    setOpen(false)
    smartNavigate(ROUTES.SUBSCRIPTION)
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
            {showStudentItems && (
              <>
                <button
                  role="menuitem"
                  onClick={handleDevices}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                >
                  <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
                  Devices
                </button>
                <button
                  role="menuitem"
                  onClick={handleSubscription}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                >
                  <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                  Subscription
                </button>
              </>
            )}
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

// ── Courses dropdown (desktop tab) ───────────────────────────────────────────

function CoursesDropdown({
  courses,
  subjects,
  loading,
  isAuthenticated,
}: {
  courses: Course[]
  subjects: Subject[]
  loading: boolean
  isAuthenticated: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const onCourseRoute = useMatch('/portal/subjects/:subjectId')
  const onPreviewRoute = useMatch('/preview/subject/:subjectId')

  useDismissable(open, () => setOpen(false), ref)

  const isActive = open || onCourseRoute !== null || onPreviewRoute !== null
  const mechanicalEngineeringChildren = buildMechanicalEngineeringChildren(subjects)
  const mechanicalEngineeringCourse = findPublishedCourse(courses, 'Mechanical Engineering')
  const masterPlumberCourse = findPublishedCourse(courses, 'Master Plumber')
  const hasPublishedCourses = mechanicalEngineeringCourse !== undefined || masterPlumberCourse !== undefined

  if (!loading && !hasPublishedCourses) return null

  // Guests browse subjects on Landing's public preview funnel. Authenticated
  // users go into the same-origin student portal where they can resume
  // learning; route guards + RLS handle access to protected content.
  const subjectHref = (id: string) =>
    isAuthenticated ? ROUTES.PORTAL_SUBJECT(id) : ROUTES.PREVIEW_SUBJECT(id)

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
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
        Courses
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-80 max-h-[70vh] overflow-y-auto rounded-xl border bg-card shadow-lg z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {loading ? (
            <div aria-busy="true" aria-live="polite" className="space-y-1.5 p-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-36" />
            </div>
          ) : (
            <div className="py-1">
              {mechanicalEngineeringCourse && (
                <>
                  <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-foreground">
                    <span>Mechanical Engineering</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>

                  <div className="ml-3 border-l border-border pl-3 pb-1 space-y-0.5">
                    {mechanicalEngineeringChildren.map((child) =>
                      child.subject ? (
                        <SmartLink
                          key={child.title}
                          to={subjectHref(child.subject.id)}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
                        >
                          {child.title}
                        </SmartLink>
                      ) : (
                        <span
                          key={child.title}
                          role="menuitem"
                          aria-disabled="true"
                          className="block cursor-not-allowed rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                        >
                          {child.title}
                        </span>
                      ),
                    )}
                  </div>
                </>
              )}

              {mechanicalEngineeringCourse && masterPlumberCourse && (
                <div className="my-1 border-t border-border" />
              )}

              {masterPlumberCourse && (
                <span
                  role="menuitem"
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                >
                  <span>Master Plumber</span>
                  <span className="text-xs">Coming soon</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Courses section (mobile, collapsible) ────────────────────────────────────

function MobileCoursesSection({
  courses,
  subjects,
  loading,
  onNavigate,
  isAuthenticated,
}: {
  courses: Course[]
  subjects: Subject[]
  loading: boolean
  onNavigate: () => void
  isAuthenticated: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mechanicalOpen, setMechanicalOpen] = useState(true)
  const mechanicalEngineeringChildren = buildMechanicalEngineeringChildren(subjects)
  const mechanicalEngineeringCourse = findPublishedCourse(courses, 'Mechanical Engineering')
  const masterPlumberCourse = findPublishedCourse(courses, 'Master Plumber')
  const hasPublishedCourses = mechanicalEngineeringCourse !== undefined || masterPlumberCourse !== undefined

  if (!loading && !hasPublishedCourses) return null

  // Match CoursesDropdown (desktop): guests go to Landing /preview/subject/:id.
  const subjectHref = (id: string) =>
    isAuthenticated ? ROUTES.PORTAL_SUBJECT(id) : ROUTES.PREVIEW_SUBJECT(id)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
      >
        <span>Courses</span>
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
            <>
              {mechanicalEngineeringCourse && (
                <>
                  <button
                    onClick={() => setMechanicalOpen((v) => !v)}
                    aria-expanded={mechanicalOpen}
                    className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/15 transition-colors"
                  >
                    <span>Mechanical Engineering</span>
                    <ChevronDown
                      className={cn('size-4 transition-transform duration-150', mechanicalOpen && 'rotate-180')}
                    />
                  </button>

                  {mechanicalOpen && (
                    <div className="ml-3 border-l border-border pl-3 space-y-0.5">
                      {mechanicalEngineeringChildren.map((child) =>
                        child.subject ? (
                          <SmartLink
                            key={child.title}
                            to={subjectHref(child.subject.id)}
                            onClick={onNavigate}
                            className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground transition-colors"
                          >
                            {child.title}
                          </SmartLink>
                        ) : (
                          <span
                            key={child.title}
                            aria-disabled="true"
                            className="block cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-muted-foreground/60"
                          >
                            {child.title}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </>
              )}

              {masterPlumberCourse && (
                <span
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-sm text-muted-foreground/60"
                >
                  <span>Master Plumber</span>
                  <span className="text-xs">Coming soon</span>
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Desktop nav rows ─────────────────────────────────────────────────────────

function PublicNavTabs({
  courses,
  subjects,
  loading,
  isAuthenticated,
}: {
  courses: Course[]
  subjects: Subject[]
  loading: boolean
  isAuthenticated: boolean
}) {
  return (
    <>
      <SmartNavLink to={ROUTES.HOME} end className={tabClass}>Home</SmartNavLink>
      <SmartNavLink to={ROUTES.ABOUT} className={tabClass}>Who we are</SmartNavLink>
      <SmartNavLink to={ROUTES.BOOKS} className={tabClass}>Books</SmartNavLink>
      <CoursesDropdown courses={courses} subjects={subjects} loading={loading} isAuthenticated={isAuthenticated} />
      <SmartNavLink to={ROUTES.FAQ}     className={tabClass}>FAQ</SmartNavLink>
      <SmartNavLink to={ROUTES.CONTACT} className={tabClass}>Contact</SmartNavLink>
    </>
  )
}

function PortalNavTabs() {
  return (
    <>
      <SmartNavLink to={ROUTES.DASHBOARD} end className={tabClass}>My Learning</SmartNavLink>
      <SmartNavLink to={ROUTES.PORTAL_SUBJECTS} className={tabClass}>Subjects</SmartNavLink>
      <SmartNavLink to={ROUTES.QUIZ_HISTORY} className={tabClass}>Quizzes</SmartNavLink>
    </>
  )
}

function DesktopAuthActionsLoading() {
  return (
    <div
      className="flex items-center justify-end gap-3"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Checking sign-in status</span>
      <Skeleton className="h-8 w-24 rounded-md" />
      <Skeleton className="h-8 w-24 rounded-md" />
      <Skeleton className="size-8 rounded-full" />
    </div>
  )
}

function MobileAuthActionsLoading() {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Checking sign-in status</span>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  )
}

// ── Shared website Navbar ────────────────────────────────────────────────────

export function Navbar() {
  const { isAuthenticated, isSubscribed, isAdmin, isInitializing, user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const onAdminRoute = useMatch('/admin/*') !== null
  const onPortalRoute = pathname === ROUTES.PORTAL || pathname.startsWith(`${ROUTES.PORTAL}/`)
  const showPortalNav = !isInitializing && onPortalRoute && isAuthenticated && !isAdmin
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>(() => subjectsCache ?? [])
  const [courses, setCourses] = useState<Course[]>(() => coursesCache ?? [])
  const [loading, setLoading] = useState<boolean>(() => subjectsCache === null || coursesCache === null)

  // Fetch the published subject and course lists once for the dynamic tabs.
  useEffect(() => {
    if (subjectsCache && coursesCache) return
    let cancelled = false
    Promise.all([fetchPublishedSubjects(), fetchPublishedCourses()])
      .then(([subjectList, courseList]) => {
        if (!cancelled) {
          setSubjects(subjectList)
          setCourses(courseList)
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
          <div className="hidden md:flex min-w-[16rem] lg:min-w-[20rem] items-center justify-end gap-3">
            {isInitializing ? (
              <DesktopAuthActionsLoading />
            ) : isAuthenticated ? (
              <>
                {!isAdmin && !showPortalNav && (
                  <SmartNavLink to={ROUTES.DASHBOARD} className={utilityLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutDashboard className="size-4" />
                      My Learning
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
                    <SmartLink to={ROUTES.SUBSCRIPTION}>Upgrade Now</SmartLink>
                  </Button>
                )}
                {user && (
                  <ProfileDropdown
                    name={user.name}
                    email={user.email}
                    showStudentItems={!isAdmin}
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
            {showPortalNav ? (
              <PortalNavTabs />
            ) : (
              <PublicNavTabs
                courses={courses}
                subjects={subjects}
                loading={loading}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>
        </nav>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden max-h-[calc(100vh-var(--site-navbar-height))] overflow-y-auto overscroll-contain border-t bg-background px-4 py-4 space-y-1">
            {showPortalNav ? (
              <>
                <MobileNavLink to={ROUTES.DASHBOARD} end onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="size-4 inline-block mr-1.5 -mt-0.5" />
                  My Learning
                </MobileNavLink>
                <MobileNavLink to={ROUTES.PORTAL_SUBJECTS} onClick={() => setMobileOpen(false)}>
                  <BookOpen className="size-4 inline-block mr-1.5 -mt-0.5" />
                  Subjects
                </MobileNavLink>
                <MobileNavLink to={ROUTES.QUIZ_HISTORY} onClick={() => setMobileOpen(false)}>
                  <Award className="size-4 inline-block mr-1.5 -mt-0.5" />
                  Quizzes
                </MobileNavLink>
              </>
            ) : (
              <>
                <MobileNavLink to={ROUTES.HOME} end onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
                <MobileNavLink to={ROUTES.ABOUT} onClick={() => setMobileOpen(false)}>Who we are</MobileNavLink>
                <MobileNavLink to={ROUTES.BOOKS} onClick={() => setMobileOpen(false)}>Books</MobileNavLink>
                <MobileCoursesSection
                  courses={courses}
                  subjects={subjects}
                  loading={loading}
                  onNavigate={() => setMobileOpen(false)}
                  isAuthenticated={isAuthenticated}
                />
                <MobileNavLink to={ROUTES.FAQ}     onClick={() => setMobileOpen(false)}>FAQ</MobileNavLink>
                <MobileNavLink to={ROUTES.CONTACT} onClick={() => setMobileOpen(false)}>Contact</MobileNavLink>

                {!isInitializing && isAuthenticated && (
                  <>
                    <div className="pt-2 mt-2 border-t" />
                    {!isAdmin && (
                      <MobileNavLink to={ROUTES.DASHBOARD} onClick={() => setMobileOpen(false)}>
                        <LayoutDashboard className="size-4 inline-block mr-1.5 -mt-0.5" />
                        My Learning
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
              </>
            )}

            <div className="pt-3 border-t mt-3 space-y-2">
              {isInitializing ? (
                <MobileAuthActionsLoading />
              ) : isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 py-1">
                    {user && <UserAvatar name={user.name} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    {isSubscribed && <Badge variant="pro" className="ml-auto shrink-0">Standard</Badge>}
                  </div>
                  {!isSubscribed && !isAdmin && (
                    <Button asChild className="w-full" size="sm">
                      <SmartLink to={ROUTES.SUBSCRIPTION} onClick={() => setMobileOpen(false)}>Upgrade Now</SmartLink>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <SmartLink to={ROUTES.PROFILE} onClick={() => setMobileOpen(false)}>
                      <User className="size-4 mr-2" />
                      View Profile
                    </SmartLink>
                  </Button>
                  {!isAdmin && (
                    <>
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <SmartLink to={ROUTES.DEVICES} onClick={() => setMobileOpen(false)}>
                          <MonitorSmartphone className="size-4 mr-2" />
                          Devices
                        </SmartLink>
                      </Button>
                      {isSubscribed && (
                        <Button asChild variant="outline" className="w-full" size="sm">
                          <SmartLink to={ROUTES.SUBSCRIPTION} onClick={() => setMobileOpen(false)}>
                            <CreditCard className="size-4 mr-2" />
                            Subscription
                          </SmartLink>
                        </Button>
                      )}
                    </>
                  )}
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
