import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/ui/ErrorMessage'
import { useAuthStore } from '@s-class/auth/authStore'
import { ApiError } from '@s-class/api/ApiError'
import { DeviceLimitError } from '@s-class/api/devicesApi'
import { DeviceLimitModal } from '@s-class/auth/components/DeviceLimitModal'
import { ROUTES } from '@/constants/routes'
import type { UserDevice } from '@s-class/types/devices'

type ReturnLocationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

export function LoginPage() {
  const login                   = useAuthStore((s) => s.login)
  const pendingDeviceLimit      = useAuthStore((s) => s.pendingDeviceLimit)
  const clearPendingDeviceLimit = useAuthStore((s) => s.clearPendingDeviceLimit)
  const navigate = useNavigate()
  const location = useLocation()
  const returnParam = safeReturnPath(new URLSearchParams(location.search).get('return'))
  const stateFrom = getStateReturnPath(location.state)

  function postLoginTarget() {
    if (returnParam) return returnParam
    if (stateFrom) return stateFrom
    return useAuthStore.getState().isAdmin ? ROUTES.ADMIN : ROUTES.DASHBOARD
  }

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [limitDevices, setLimitDevices] = useState<UserDevice[] | null>(null)

  const fieldErrors = submitted
    ? { email: !email.trim(), password: !password }
    : { email: false, password: false }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (!email || !password) {
      setError('Please fill in all fields.')
      if (!email.trim()) {
        document.getElementById('email')?.focus()
      } else {
        document.getElementById('password')?.focus()
      }
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      navigate(postLoginTarget(), { replace: true })
    } catch (err) {
      if (err instanceof DeviceLimitError) {
        // Phase G — hard cap hit. Show modal; user must revoke before retrying.
        setLimitDevices(err.devices)
      } else if (err instanceof ApiError) {
        // Show the real Supabase error (e.g. "Email not confirmed", "Invalid login credentials")
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Phase G — if initialize() detected a device-limit, surface the modal too.
  const modalDevices = limitDevices ?? pendingDeviceLimit
  function dismissLimitModal() {
    setLimitDevices(null)
    clearPendingDeviceLimit()
  }
  async function retryAfterRevoke() {
    dismissLimitModal()
    // Re-submit the form silently if we have credentials still in state.
    if (email && password) {
      setLoading(true)
      try {
        await login(email, password)
        navigate(postLoginTarget(), { replace: true })
      } catch (err) {
        if (err instanceof DeviceLimitError) setLimitDevices(err.devices)
        else if (err instanceof ApiError) setError(err.message)
        else setError('Login failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {/* Phase G device-limit modal (login + initialize sources) */}
      {modalDevices && (
        <DeviceLimitModal
          devices={modalDevices}
          onRevoked={retryAfterRevoke}
          onCancel={dismissLimitModal}
        />
      )}

      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Log in to continue your learning journey
          </p>
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
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldErrors.email || undefined}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline underline-offset-4 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={fieldErrors.password || undefined}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Logging in…
                </>
              ) : (
                'Log in'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to={withReturnParam(ROUTES.REGISTER, returnParam ?? stateFrom)} className="font-medium text-primary hover:underline underline-offset-4">
            Enroll Now
          </Link>
        </p>
      </div>
    </section>
  )
}

function getStateReturnPath(state: unknown): string | null {
  const from = (state as ReturnLocationState | null)?.from
  if (!from?.pathname) return null
  return safeReturnPath(`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`)
}

function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function withReturnParam(path: string, returnTo: string | null): string {
  if (!returnTo) return path
  return `${path}?return=${encodeURIComponent(returnTo)}`
}
