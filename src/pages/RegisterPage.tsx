import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { ApiError } from '@/services/ApiError'
import { ROUTES } from '@/constants/routes'

export function RegisterPage() {
  const register            = useAuthStore((s) => s.register)
  const confirmationPending = useAuthStore((s) => s.confirmationPending)
  const navigate            = useNavigate()

  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await register(name, email, password)
      // If no confirmation is needed, the store sets isAuthenticated — navigate home.
      // If confirmation IS needed, confirmationPending becomes true and we stay here
      // to show the "check your email" screen.
      if (!useAuthStore.getState().confirmationPending) {
        navigate(ROUTES.HOME, { replace: true })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Email confirmation pending ────────────────────────────────────────────────
  if (confirmationPending) {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account, then come back to log in.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={ROUTES.LOGIN}>Go to login</Link>
          </Button>
        </div>
      </section>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────────
  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Join thousands of learners today — it&apos;s free
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By signing up you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span>
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}
