import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, MailCheck, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { ApiError } from '@/services/ApiError'
import { ROUTES } from '@/constants/routes'

function RequiredMark() {
  return <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
}

function passwordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)
}

export function RegisterPage() {
  const register            = useAuthStore((s) => s.register)
  const confirmationPending = useAuthStore((s) => s.confirmationPending)
  const navigate            = useNavigate()

  const [firstName,       setFirstName]       = useState('')
  const [lastName,        setLastName]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mobileNumber,    setMobileNumber]    = useState('')
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [submitted,       setSubmitted]       = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const pwRules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }
  const pwAllValid = pwRules.length && pwRules.uppercase && pwRules.number

  const fieldErrors = submitted
    ? {
        firstName:       !firstName.trim(),
        lastName:        !lastName.trim(),
        email:           !email.trim(),
        password:        !pwAllValid,
        confirmPassword: !confirmPassword || confirmPassword !== password,
      }
    : { firstName: false, lastName: false, email: false, password: false, confirmPassword: false }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      focusFirstInvalid({ firstName, lastName, email, password, confirmPassword, pwAllValid })
      return
    }

    if (!pwAllValid) {
      setError('Password does not meet the requirements.')
      document.getElementById('password')?.focus()
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      document.getElementById('confirmPassword')?.focus()
      return
    }

    setLoading(true)
    try {
      await register(firstName, lastName, email, password, mobileNumber)
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First name<RequiredMark />
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={fieldErrors.firstName || undefined}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last name<RequiredMark />
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={fieldErrors.lastName || undefined}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address<RequiredMark />
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

            {/* Mobile number — optional */}
            <div className="space-y-1.5">
              <label htmlFor="mobile" className="text-sm font-medium">
                Mobile number{' '}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="mobile"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password<RequiredMark />
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
                aria-invalid={fieldErrors.password || undefined}
              />
              {/* Password requirements — visible while focused or after invalid submit */}
              {(passwordFocused || (submitted && !pwAllValid)) && (
                <ul className="mt-2 space-y-1">
                  <PasswordRule met={pwRules.length}   label="At least 8 characters" />
                  <PasswordRule met={pwRules.uppercase} label="At least one uppercase letter" />
                  <PasswordRule met={pwRules.number}   label="At least one number" />
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password<RequiredMark />
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={fieldErrors.confirmPassword || undefined}
              />
              {submitted && confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
              )}
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

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {met
        ? <Check className="size-3 shrink-0" />
        : <X className="size-3 shrink-0" />
      }
      {label}
    </li>
  )
}

function focusFirstInvalid(fields: {
  firstName: string; lastName: string; email: string
  password: string; confirmPassword: string; pwAllValid: boolean
}) {
  const order = [
    { id: 'firstName',       invalid: !fields.firstName.trim() },
    { id: 'lastName',        invalid: !fields.lastName.trim() },
    { id: 'email',           invalid: !fields.email.trim() },
    { id: 'password',        invalid: !fields.pwAllValid },
    { id: 'confirmPassword', invalid: !fields.confirmPassword || fields.confirmPassword !== fields.password },
  ]
  const first = order.find((f) => f.invalid)
  if (first) document.getElementById(first.id)?.focus()
}
