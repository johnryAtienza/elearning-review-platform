import { Check, X, CalendarDays, Clock } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/features/subscription/hooks/useSubscription'
import { formatPrice } from '@/features/subscription/services/subscriptionService'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import type { SubscriptionDuration } from '@/features/subscription/types'

const COMPARISON_ROWS: { label: string; free: string | boolean; standard: string | boolean }[] = [
  { label: 'Browse courses',          free: true,             standard: true },
  { label: 'Video access',            free: '30s preview',    standard: 'Full access' },
  { label: 'Reviewer PDFs',           free: 'First 5 pages',  standard: 'Full access' },
  { label: 'Quizzes',                 free: false,            standard: true },
  { label: 'Score + correct answers', free: false,            standard: true },
  { label: 'Progress tracking',       free: false,            standard: true },
  { label: 'Download content',        free: false,            standard: false },
]

export function SubscriptionPage() {
  const { isAuthenticated } = useAuthStore()
  const {
    isSubscribed,
    subscription,
    durationOptions,
    selectedDuration,
    setSelectedDuration,
    subscribe,
    subscribing,
    error,
    plans,
  } = useSubscription()

  const navigate  = useNavigate()
  const location  = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.COURSES

  async function handleSubscribe() {
    await subscribe()
    navigate(from, { replace: true })
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const selectedOption = durationOptions.find((o) => o.months === selectedDuration) ?? durationOptions[0]

  function formatExpiry(iso: string | null): string {
    if (!iso) return 'No expiry'
    return new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <section className="container mx-auto px-4 py-14 max-w-4xl space-y-12">

      {/* ── Active subscription banner ── */}
      {isSubscribed && subscription && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Standard Plan — Active</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                {subscription.expiresAt && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    Expires {formatExpiry(subscription.expiresAt)}
                  </span>
                )}
                {subscription.daysRemaining !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {subscription.daysRemaining} day{subscription.daysRemaining !== 1 ? 's' : ''} remaining
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right shrink-0">
            Extend below to carry over remaining days.
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {isSubscribed ? 'Extend your plan' : 'Choose your plan'}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isSubscribed
            ? 'Adding months carries over your remaining days — nothing is lost.'
            : 'Start for free, upgrade when you\'re ready to unlock the full learning experience.'}
        </p>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid gap-5 sm:grid-cols-2 max-w-2xl mx-auto">

        {/* Free card */}
        {(() => {
          const plan = plans.find((p) => p.id === 'free')!
          const isCurrent = !isSubscribed
          return (
            <div className="rounded-2xl border bg-card p-6 flex flex-col gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <Button variant="outline" disabled={isCurrent} className="w-full">
                {isCurrent ? 'Current plan' : 'Downgrade'}
              </Button>
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
        })()}

        {/* Standard card with duration selector */}
        {(() => {
          const plan = plans.find((p) => p.id === 'standard')!
          return (
            <div className="rounded-2xl border border-primary shadow-md ring-1 ring-primary/20 bg-card p-6 flex flex-col gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  {isSubscribed
                    ? <Badge variant="success">Active</Badge>
                    : <Badge variant="pro">Recommended</Badge>}
                </div>

                {/* Duration tabs — no overflow-hidden so tooltips aren't clipped */}
                <div className="flex rounded-lg border text-xs font-medium">
                  {durationOptions.map((opt, i) => (
                    <button
                      key={opt.months}
                      onClick={() => setSelectedDuration(opt.months as SubscriptionDuration)}
                      className={cn(
                        'relative flex-1 py-2 transition-colors group',
                        i === 0 && 'rounded-l-lg',
                        i === durationOptions.length - 1 && 'rounded-r-lg',
                        i > 0 && 'border-l',
                        selectedDuration === opt.months
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      {opt.label}

                      {/* Discount tooltip */}
                      {opt.discountPercent > 0 && (
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover text-popover-foreground border text-[11px] font-semibold px-2 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                          Save {opt.discountPercent}%
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Price display */}
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{formatPrice(selectedOption.priceTotal)}</span>
                    <span className="text-sm text-muted-foreground mb-1">
                      / {selectedOption.label.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatPrice(selectedOption.pricePerMonth)}/mo
                    </span>
                    {selectedOption.discountPercent > 0 && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 rounded px-1.5 py-0.5">
                        Save {selectedOption.discountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* CTA */}
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
              )}

              {isSubscribed ? (
                <Button onClick={handleSubscribe} disabled={subscribing} className="w-full">
                  {subscribing ? 'Processing…' : `Extend by ${selectedOption.label} — ${formatPrice(selectedOption.priceTotal)}`}
                </Button>
              ) : isAuthenticated ? (
                <Button onClick={handleSubscribe} disabled={subscribing} className="w-full">
                  {subscribing ? 'Processing…' : `${plan.cta} — ${formatPrice(selectedOption.priceTotal)}`}
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
              </ul>

              {/* Carryover note */}
              {isSubscribed && (
                <p className="text-xs text-muted-foreground text-center border-t pt-3">
                  Your {subscription?.daysRemaining ?? 0} remaining day{subscription?.daysRemaining !== 1 ? 's' : ''} carry over automatically.
                </p>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Comparison table ── */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          Plan Comparison
        </h2>
        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/40 text-sm font-semibold border-b">
            <div className="px-4 py-3">Feature</div>
            <div className="px-4 py-3 text-center text-muted-foreground">Free</div>
            <div className="px-4 py-3 text-center text-primary">Standard</div>
          </div>
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={cn('grid grid-cols-3 text-sm', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}
            >
              <div className="px-4 py-3 text-muted-foreground">{row.label}</div>
              <div className="px-4 py-3 flex justify-center items-center">
                <ComparisonCell value={row.free} />
              </div>
              <div className="px-4 py-3 flex justify-center items-center">
                <ComparisonCell value={row.standard} highlight />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        No credit card required for the free plan. Cancel Standard anytime.
      </p>
    </section>
  )
}

function ComparisonCell({ value, highlight = false }: { value: string | boolean; highlight?: boolean }) {
  if (value === true)  return <Check className={cn('size-4', highlight ? 'text-primary' : 'text-green-500')} />
  if (value === false) return <X className="size-4 text-muted-foreground/40" />
  return (
    <span className={cn('text-xs font-medium', highlight ? 'text-primary' : 'text-muted-foreground')}>
      {value}
    </span>
  )
}
