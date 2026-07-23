import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl, getCurrentSubdomain, getRouteOwner } from '@s-class/constants/urls'
import { DEFAULT_HOME_HERO, homeContentApi } from '@s-class/api/homeContentApi'
import type { HomeHeroContent } from '@s-class/types/home'

// Captured at module load (same pattern Navbar uses) so we don't re-detect on
// every render. SSR-safe (defaults to 'landing').
const CURRENT_SUBDOMAIN = getCurrentSubdomain()

function isCrossOrigin(to: string): boolean {
  return getRouteOwner(to) !== CURRENT_SUBDOMAIN
}

/**
 * Top-of-Home hero. Drives conversion with a primary "Enroll Now" CTA and
 * a clearly-visible secondary "Log in" CTA. Replaces the previous behaviour
 * where Login was only reachable via the navbar.
 *
 * Auth-aware:
 *   - Guest          → "Enroll Now" → /register   + "Log in" → /login
 *   - Free authed    → "Enroll Now" → /subscription          (no Log in)
 *   - Subscribed     → "Continue Learning" → /portal/dashboard (no Log in)
 *   - Admin          → "Go to Admin" → /admin                (no Log in)
 */
export function HeroBlock() {
  const { isAuthenticated, isSubscribed, isAdmin } = useAuthStore()
  const [hero, setHero] = useState<HomeHeroContent | null>(null)

  useEffect(() => {
    let cancelled = false

    homeContentApi.getHomeHero()
      .then((content) => { if (!cancelled) setHero(content) })
      .catch(() => { if (!cancelled) setHero(DEFAULT_HOME_HERO) })

    return () => { cancelled = true }
  }, [])

  if (!hero) return <HeroBlockSkeleton />

  const primary: { label: string; to: string } =
    isAdmin
      ? { label: 'Go to Admin',       to: ROUTES.ADMIN }
      : isSubscribed
        ? { label: 'Continue Learning', to: ROUTES.DASHBOARD }
        : isAuthenticated
          ? { label: hero.primaryButton, to: ROUTES.SUBSCRIPTION }
          : { label: hero.primaryButton, to: ROUTES.REGISTER }

  const showLogin = !isAuthenticated

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      {/* Soft brand wash */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/15 via-card to-card pointer-events-none" />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-start gap-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {hero.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
          {hero.title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
          {hero.description}
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            {isCrossOrigin(primary.to) ? (
              <a href={getAbsoluteUrl(primary.to)}>
                {primary.label}
                <ArrowRight className="size-4 ml-2" />
              </a>
            ) : (
              <Link to={primary.to}>
                {primary.label}
                <ArrowRight className="size-4 ml-2" />
              </Link>
            )}
          </Button>
          {showLogin && (
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
              {isCrossOrigin(ROUTES.LOGIN) ? (
                <a href={getAbsoluteUrl(ROUTES.LOGIN)}>
                  <LogIn className="size-4 mr-2" />
                  {hero.secondaryButton}
                </a>
              ) : (
                <Link to={ROUTES.LOGIN}>
                  <LogIn className="size-4 mr-2" />
                  {hero.secondaryButton}
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function HeroBlockSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      <div className="absolute inset-0 bg-linear-to-br from-primary/15 via-card to-card pointer-events-none" />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-start gap-5 max-w-3xl">
        <Skeleton className="h-3 w-36 bg-primary/20" />
        <div className="space-y-3 w-full max-w-2xl">
          <Skeleton className="h-9 sm:h-11 lg:h-12 w-full" />
          <Skeleton className="h-9 sm:h-11 lg:h-12 w-4/5" />
        </div>
        <div className="space-y-2 w-full max-w-xl">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <Skeleton className="h-12 w-36 rounded-md bg-primary/20" />
          <Skeleton className="h-12 w-28 rounded-md" />
        </div>
      </div>
    </section>
  )
}
