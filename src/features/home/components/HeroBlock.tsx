import { Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

/**
 * Top-of-Home hero. Drives conversion with a primary "Enroll Now" CTA and
 * a clearly-visible secondary "Log in" CTA. Replaces the previous behaviour
 * where Login was only reachable via the navbar.
 *
 * Auth-aware:
 *   - Guest          → "Enroll Now" → /register   + "Log in" → /login
 *   - Free authed    → "Enroll Now" → /subscription          (no Log in)
 *   - Subscribed     → "Continue Learning" → /dashboard      (no Log in)
 *   - Admin          → "Go to Admin" → /admin                (no Log in)
 */
export function HeroBlock() {
  const { isAuthenticated, isSubscribed, isAdmin } = useAuthStore()

  const primary: { label: string; to: string } =
    isAdmin
      ? { label: 'Go to Admin',       to: ROUTES.ADMIN }
      : isSubscribed
        ? { label: 'Continue Learning', to: ROUTES.DASHBOARD }
        : isAuthenticated
          ? { label: 'Enroll Now',      to: ROUTES.SUBSCRIPTION }
          : { label: 'Enroll Now',      to: ROUTES.REGISTER }

  const showLogin = !isAuthenticated

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      {/* Soft brand wash */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/15 via-card to-card pointer-events-none" />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-start gap-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          S Class Review
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
          Pass the boards on your first attempt.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
          Daily multiple-choice drills, weekly catch-up sessions with a board
          topnotcher, and printed reviewers shipped nationwide. Six months of
          structured prep, one transparent plan.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link to={primary.to}>
              {primary.label}
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
          {showLogin && (
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
              <Link to={ROUTES.LOGIN}>
                <LogIn className="size-4 mr-2" />
                Log in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
