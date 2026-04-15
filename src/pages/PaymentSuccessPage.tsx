import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Loader2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { subscriptionApi } from '@/services/subscriptionApi'
import { useAuthStore } from '@/store/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'verifying' | 'success' | 'already_paid' | 'failed' | 'no_session'

// ── Page ──────────────────────────────────────────────────────────────────────

export function PaymentSuccessPage() {
  const [searchParams]  = useSearchParams()
  const sessionId       = searchParams.get('session_id') ?? ''
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

    subscriptionApi.verifyPayment(sessionId)
      .then(async (result) => {
        setExpiresAt(result.expiresAt)
        // Sync the store so the navbar + other components reflect the new subscription
        await syncSubscription()
        setPageState(result.alreadyProcessed ? 'already_paid' : 'success')
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Verification failed. Please contact support.'
        setError(msg)
        setPageState('failed')
      })
  }, [sessionId, syncSubscription])

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
            <Link to={ROUTES.SUBSCRIPTION}>View plans</Link>
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
          <p className="text-sm font-medium">Activating your subscription…</p>
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
              {error || 'We could not confirm your payment. If you were charged, your subscription will be activated shortly via our payment verification system.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={ROUTES.SUBSCRIPTION}>Try again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={ROUTES.HOME}>Go home</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // ── Success / already activated ────────────────────────────────────────────
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
            <Link to={ROUTES.COURSES}>
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
