import { Check } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/features/subscription/hooks/useSubscription'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

export function SubscriptionPage() {
  const { isAuthenticated } = useAuthStore()
  const { isSubscribed, subscribe, plans, loading } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.COURSES

  function handleSubscribe() {
    subscribe()
    navigate(from, { replace: true })
  }

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-14 max-w-4xl space-y-10">
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 max-w-2xl mx-auto">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-14 max-w-4xl space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start for free, upgrade when you&apos;re ready to unlock the full learning experience.
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-5 sm:grid-cols-2 max-w-2xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPro  = plan.id === 'pro'  && isSubscribed
          const isCurrentFree = plan.id === 'free' && !isSubscribed

          return (
            <div
              key={plan.id}
              className={cn(
                'rounded-2xl border bg-card p-6 flex flex-col gap-5',
                plan.highlight && 'border-primary shadow-md ring-1 ring-primary/20',
              )}
            >
              {/* Plan header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  {plan.highlight && <Badge variant="pro">Most Popular</Badge>}
                  {isCurrentPro  && <Badge variant="success">Active</Badge>}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* CTA */}
              {plan.id === 'free' ? (
                <Button variant="outline" disabled className="w-full">
                  {isCurrentFree ? 'Current plan' : 'Downgrade'}
                </Button>
              ) : isSubscribed ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-center text-sm text-green-700 font-medium">
                  ✓ You&apos;re on Pro
                </div>
              ) : isAuthenticated ? (
                <Button onClick={handleSubscribe} className="w-full">
                  {plan.cta}
                </Button>
              ) : (
                <Button onClick={() => navigate(ROUTES.REGISTER)} className="w-full">
                  Sign up to Subscribe
                </Button>
              )}

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-green-500 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                    <span className="size-4 shrink-0 flex items-center justify-center text-muted-foreground/40 mt-0.5">✗</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        No credit card required for the free plan. Cancel Pro anytime.
      </p>
    </section>
  )
}
