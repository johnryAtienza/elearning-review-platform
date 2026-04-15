import { type FormEvent, useEffect, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/ui/ErrorMessage'
import { useAuthStore } from '@/store/authStore'
import { getProfile, updateProfile, updatePassword } from '@/features/auth/services/profileService'
import { toast } from '@/lib/toast'

// ── Password rule indicator (same pattern as ResetPasswordPage) ───────────────

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {met ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
      {label}
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, setUser } = useAuthStore()

  // ── Basic info state ───────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [memberSince,  setMemberSince]  = useState<string | null>(null)
  const [infoLoading,  setInfoLoading]  = useState(false)
  const [infoError,    setInfoError]    = useState('')
  const [infoSubmitted, setInfoSubmitted] = useState(false)

  // ── Password state ─────────────────────────────────────────────────────────
  const [newPassword,  setNewPassword]  = useState('')
  const [confirmPw,    setConfirmPw]    = useState('')
  const [pwLoading,    setPwLoading]    = useState(false)
  const [pwError,      setPwError]      = useState('')
  const [pwSubmitted,  setPwSubmitted]  = useState(false)
  const [pwFocused,    setPwFocused]    = useState(false)

  const pwRules = {
    length:    newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number:    /[0-9]/.test(newPassword),
  }
  const pwAllValid = pwRules.length && pwRules.uppercase && pwRules.number

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    getProfile(user.id)
      .then((profile) => {
        setFirstName(profile.first_name ?? user.firstName)
        setLastName(profile.last_name ?? user.lastName)
        setMobileNumber(profile.mobile_number ?? user.mobileNumber)
        setMemberSince(profile.created_at)
      })
      .catch(() => {
        // Fall back to store values if the DB fetch fails
        setFirstName(user.firstName)
        setLastName(user.lastName)
        setMobileNumber(user.mobileNumber)
      })
  }, [user])

  // ── Update basic info ──────────────────────────────────────────────────────
  async function handleInfoSubmit(e: FormEvent) {
    e.preventDefault()
    setInfoError('')
    setInfoSubmitted(true)

    if (!firstName.trim() || !lastName.trim()) {
      setInfoError('First name and last name are required.')
      return
    }

    setInfoLoading(true)
    try {
      await updateProfile(user!.id, {
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
        mobileNumber: mobileNumber.trim(),
      })

      const name = `${firstName.trim()} ${lastName.trim()}`.trim()
      setUser({ name, firstName: firstName.trim(), lastName: lastName.trim(), mobileNumber: mobileNumber.trim() })
      toast.success('Profile updated successfully!')
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Failed to update profile.')
      toast.error(err, 'Failed to update profile.')
    } finally {
      setInfoLoading(false)
    }
  }

  // ── Update password ────────────────────────────────────────────────────────
  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSubmitted(true)

    if (!newPassword || !confirmPw) {
      setPwError('Please fill in all fields.')
      return
    }
    if (!pwAllValid) {
      setPwError('Password does not meet the requirements.')
      return
    }
    if (newPassword !== confirmPw) {
      setPwError('Passwords do not match.')
      return
    }

    setPwLoading(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPw('')
      setPwSubmitted(false)
      toast.success('Password updated successfully!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.'
      setPwError(/expired|invalid/i.test(msg) ? 'Session expired. Please log in again.' : msg)
    } finally {
      setPwLoading(false)
    }
  }

  if (!user) return null

  const formattedDate = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <section className="container mx-auto px-4 py-10 max-w-2xl space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and security settings.</p>
      </div>

      {/* Avatar + identity summary */}
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground select-none">
          {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </span>
        <div>
          <p className="font-semibold text-lg leading-tight">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {formattedDate && (
            <p className="text-xs text-muted-foreground mt-0.5">Member since {formattedDate}</p>
          )}
        </div>
      </div>

      {/* ── Section A: Basic Information ───────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold">Basic Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Update your name and contact details.</p>
        </div>

        {infoError && <FormAlert>{infoError}</FormAlert>}

        <form onSubmit={handleInfoSubmit} className="space-y-4" noValidate>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email address</label>
            <Input
              type="email"
              value={user.email}
              readOnly
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-sm font-medium">First name</label>
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={(infoSubmitted && !firstName.trim()) || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={(infoSubmitted && !lastName.trim()) || undefined}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label htmlFor="mobileNumber" className="text-sm font-medium">Phone number</label>
            <Input
              id="mobileNumber"
              type="tel"
              placeholder="+63 900 000 0000"
              autoComplete="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={infoLoading}>
            {infoLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </form>
      </div>

      {/* ── Section B: Account Security ────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold">Account Security</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set a new password for your account.</p>
        </div>

        {pwError && <FormAlert>{pwError}</FormAlert>}

        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>

          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium">New password</label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Create a new password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              aria-invalid={(pwSubmitted && !pwAllValid) || undefined}
            />
            {(pwFocused || (pwSubmitted && !pwAllValid)) && (
              <ul className="mt-2 space-y-1">
                <PasswordRule met={pwRules.length}    label="At least 8 characters" />
                <PasswordRule met={pwRules.uppercase} label="At least one uppercase letter" />
                <PasswordRule met={pwRules.number}    label="At least one number" />
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPw" className="text-sm font-medium">Confirm new password</label>
            <Input
              id="confirmPw"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              aria-invalid={(pwSubmitted && !!confirmPw && confirmPw !== newPassword) || undefined}
            />
            {pwSubmitted && confirmPw && confirmPw !== newPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
            )}
          </div>

          <Button type="submit" disabled={pwLoading}>
            {pwLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </div>

    </section>
  )
}
