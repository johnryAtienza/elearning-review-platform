import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Loader2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/ui/ErrorMessage'
import { ROUTES } from '@/constants/routes'
import { supabase } from '@/services/supabaseClient'
import { toast } from '@/lib/toast'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'success' | 'invalid'

// ── Page ──────────────────────────────────────────────────────────────────────

export function ResetPasswordPage() {
  const navigate = useNavigate()

  const [pageState,      setPageState]      = useState<PageState>('loading')
  const [password,       setPassword]       = useState('')
  const [confirmPw,      setConfirmPw]      = useState('')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const pwRules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }
  const pwAllValid = pwRules.length && pwRules.uppercase && pwRules.number

  // ── Detect Supabase PASSWORD_RECOVERY session ──────────────────────────────
  useEffect(() => {
    // If no recovery event arrives within 5 s, the link is invalid or expired.
    const timeout = setTimeout(() => {
      setPageState((s) => s === 'loading' ? 'invalid' : s)
    }, 5000)

    // Supabase (detectSessionInUrl: true) automatically parses the URL hash and
    // fires PASSWORD_RECOVERY once the token is exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout)
        setPageState('ready')
      }
    })

    // Handle the case where the user refreshed — session may already exist.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timeout)
        setPageState('ready')
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // ── Form submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (!password || !confirmPw) {
      setError('Please fill in all fields.')
      document.getElementById('password')?.focus()
      return
    }
    if (!pwAllValid) {
      setError('Password does not meet the requirements.')
      document.getElementById('password')?.focus()
      return
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.')
      document.getElementById('confirmPw')?.focus()
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)

      setPageState('success')
      toast.success('Password updated successfully!')

      // Auto-redirect to login after 3 s
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.'
      if (/expired|invalid/i.test(msg)) {
        setError('This reset link has expired. Please request a new one.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </section>
    )
  }

  if (pageState === 'invalid') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <X className="size-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Link expired</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
              Reset links are only valid for a limited time.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={ROUTES.FORGOT_PASSWORD}>Request a new link</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline underline-offset-4">
              Back to login
            </Link>
          </p>
        </div>
      </section>
    )
  }

  if (pageState === 'success') {
    return (
      <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Password updated!</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been changed successfully.
              Redirecting you to login…
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={ROUTES.LOGIN}>Go to login</Link>
          </Button>
        </div>
      </section>
    )
  }

  // ── Ready — password form ──────────────────────────────────────────────────
  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          {error && <FormAlert>{error}</FormAlert>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* New password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                aria-invalid={(submitted && !pwAllValid) || undefined}
              />
              {/* Password requirements — show while focused or after invalid submit */}
              {(passwordFocused || (submitted && !pwAllValid)) && (
                <ul className="mt-2 space-y-1">
                  <PasswordRule met={pwRules.length}    label="At least 8 characters" />
                  <PasswordRule met={pwRules.uppercase} label="At least one uppercase letter" />
                  <PasswordRule met={pwRules.number}    label="At least one number" />
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPw" className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="confirmPw"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                aria-invalid={(submitted && !!confirmPw && confirmPw !== password) || undefined}
              />
              {submitted && confirmPw && confirmPw !== password && (
                <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating password…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

// ── Password rule indicator ───────────────────────────────────────────────────

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {met
        ? <Check className="size-3 shrink-0" />
        : <X    className="size-3 shrink-0" />
      }
      {label}
    </li>
  )
}
