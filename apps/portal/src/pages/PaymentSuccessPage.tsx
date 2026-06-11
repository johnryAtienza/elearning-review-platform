import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Loader2, ShieldCheck, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { subscriptionApi } from '@s-class/api/subscriptionApi'
import { booksApi } from '@s-class/api/booksApi'
import { useAuthStore } from '@s-class/auth/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'verifying' | 'success' | 'already_paid' | 'failed' | 'no_session'
type PaymentKind = 'subscription' | 'book'

// ── Page ──────────────────────────────────────────────────────────────────────

export function PaymentSuccessPage() {
  const [searchParams]  = useSearchParams()
  const sessionId       = searchParams.get('session_id') ?? ''
  const kindParam       = searchParams.get('kind') ?? ''
  const kind: PaymentKind = kindParam === 'book' ? 'book' : 'subscription'
  const { syncSubscription } = useAuthStore()

  const [pageState, setPageState] = useState<PageState>(
    sessionId ? 'verifying' : 'no_session'
  )
  const [error,     setError]     = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Guard against React StrictMode double-invoking the effect
  const verified = useRef(false)

  useEffect(() => {
    if (!sessionId || verified.current) return
    verified.current = true

    const promise = kind === 'book'
      ? booksApi.verifyPayment(sessionId).then((r) => ({
          alreadyProcessed: r.alreadyProcessed,
          expiresAt:        null,                 // books have no expiry
        }))
      : subscriptionApi.verifyPayment(sessionId).then((r) => ({
          alreadyProcessed: r.alreadyProcessed,
          expiresAt:        r.expiresAt,
        }))

    promise
      .then(async (result) => {
        setExpiresAt(result.expiresAt)
        // Subscription state only changes for subscription payments
        if (kind === 'subscription') await syncSubscription()
        setPageState(result.alreadyProcessed ? 'already_paid' : 'success')
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Verification failed. Please contact support.'
        setError(msg)
        setPageState('failed')
      })
  }, [sessionId, kind, syncSubscription])

  // ── No session_id in URL ───────────────────────────────────────────────────
  if (pageState === 'no_session') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <X className="size-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Invalid link</h1>
            <p className="text-sm text-muted-foreground">
              This page can only be reached after completing a payment.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={ROUTES.HOME}>Go home</Link>
          </Button>
        </div>
      </section>
    )
  }

  // ── Verifying payment ──────────────────────────────────────────────────────
  if (pageState === 'verifying') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium">
            {kind === 'book' ? 'Confirming your order…' : 'Activating your subscription…'}
          </p>
          <p className="text-xs text-muted-foreground">This will only take a moment.</p>
        </div>
      </section>
    )
  }

  // ── Verification failed ────────────────────────────────────────────────────
  if (pageState === 'failed') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <X className="size-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Payment issue</h1>
            <p className="text-sm text-muted-foreground">
              {error || (kind === 'book'
                ? 'We could not confirm your order. If you were charged, your order will be processed shortly via our payment verification system.'
                : 'We could not confirm your payment. If you were charged, your subscription will be activated shortly via our payment verification system.'
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={kind === 'book' ? ROUTES.BOOKS : ROUTES.SUBSCRIPTION}>
                {kind === 'book' ? 'Back to books' : 'Try again'}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={ROUTES.HOME}>Go home</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // ── Success / already processed ────────────────────────────────────────────

  // Book purchase success view
  if (kind === 'book') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Package className="size-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {pageState === 'already_paid' ? 'Order already confirmed' : 'Order placed!'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pageState === 'already_paid'
                ? 'This payment has already been recorded. Your book is on the way.'
                : "Thanks for your order. We'll pack and ship it within 5 business days."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={ROUTES.DASHBOARD}>View My Books</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={ROUTES.BOOKS}>Browse more books</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // Subscription success view (existing)
  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {pageState === 'already_paid' ? 'Already activated!' : "You're all set!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pageState === 'already_paid'
              ? 'Your Standard subscription is already active.'
              : 'Payment confirmed. Your Standard subscription is now active.'}
          </p>
          {formattedDate && (
            <p className="text-xs text-muted-foreground">
              Access valid until{' '}
              <span className="font-medium text-foreground">{formattedDate}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to={ROUTES.SUBJECTS}>
              <Check className="size-4 mr-2" />
              Start learning
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={ROUTES.DASHBOARD}>Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
