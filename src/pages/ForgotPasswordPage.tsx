import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/ui/ErrorMessage'
import { ROUTES } from '@/constants/routes'
import { resetPasswordForEmail } from '@/features/auth/services/authService'

export function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [sent,      setSent]      = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fieldError = submitted && !email.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (!email.trim()) {
      setError('Please enter your email address.')
      document.getElementById('email')?.focus()
      return
    }

    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}${ROUTES.RESET_PASSWORD}`
      await resetPasswordForEmail(email.trim(), redirectTo)
    } catch {
      // Intentionally ignored — we always show the same success message
      // regardless of outcome to prevent email enumeration.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  // ── Sent confirmation screen ──────────────────────────────────────────────────
  if (sent) {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If <span className="font-medium text-foreground">{email}</span> is registered,
              we&apos;ve sent a password reset link. Check your inbox and spam folder.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link to={ROUTES.LOGIN}>Back to login</Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive it?{' '}
            <button
              type="button"
              onClick={() => { setSent(false); setSubmitted(false) }}
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Try again
            </button>
          </p>
        </div>
      </section>
    )
  }

  // ── Email input form ──────────────────────────────────────────────────────────
  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          {error && <FormAlert>{error}</FormAlert>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldError || undefined}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  )
}
