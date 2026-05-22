import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@s-class/ui/button'
import { Input } from '@s-class/ui/input'
import { FormAlert } from '@s-class/ui/ErrorMessage'
import { useAuthStore } from '@s-class/auth/authStore'
import { ApiError } from '@s-class/api/ApiError'
import { DeviceLimitError } from '@s-class/api/devicesApi'

/**
 * Admin subdomain login.
 *
 * Differs from the shared LoginPage:
 *  - No "forgot password" / "register" links (admin accounts are
 *    provisioned server-side, not self-serve).
 *  - Hard-reject non-admin accounts: if a successful login lands as
 *    a non-admin, we log out immediately and show an inline error
 *    rather than leaving a stray non-admin session on admin.*.
 *
 * Reuses useAuthStore.login() — same auth call the shared LoginPage uses.
 */
export function AdminLoginPage() {
  const login   = useAuthStore((s) => s.login)
  const logout  = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      await login(email, password)

      // Bounce non-admins off the admin subdomain immediately.
      if (!useAuthStore.getState().isAdmin) {
        await logout()
        setError('This account is not an admin.')
        return
      }

      navigate('/admin', { replace: true })
    } catch (err) {
      if (err instanceof DeviceLimitError) {
        setError(
          'This account has reached the device limit. Sign out of an existing ' +
          'device from the user app, then try again.',
        )
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Admin sign in</h1>
            <p className="text-xs text-muted-foreground">
              Restricted area. Authorized accounts only.
            </p>
          </div>
        </div>

        {/* Card */}
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
                placeholder="admin@example.com"
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
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
