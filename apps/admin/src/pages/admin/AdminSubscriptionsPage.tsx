import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Power,
  RefreshCw,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { ApiError } from '@s-class/api/ApiError'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AdminTableHeader, AdminTableSearch, ADMIN_ROW_BASE, filterTabClass, LoadError, formatAdminDate,
  matchesAdminSearch,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  extendAdminSubscription,
  getAdminSubscriptions,
  getAdminSubscriptionEffectiveStatus,
  renewAdminSubscription,
  setAdminSubscriptionCustomExpiry,
  setSubscriptionActive,
  type AdminSubscription,
  type AdminSubscriptionManualDuration,
} from '@s-class/api/admin.service'

// ── Column layout ─────────────────────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[1fr_6rem_7rem_8rem_14rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'User' },
  { label: 'Plan',    center: true, smOnly: true },
  { label: 'Status',  center: true },
  { label: 'Expires', center: true, smOnly: true },
  { label: 'Actions', center: true },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'expired' | 'inactive'
type RenewalMode = 'renew' | 'extend' | 'set_expiry'
type RenewalSelection = AdminSubscriptionManualDuration | 'custom'
type ActionVariant = 'default' | 'outline' | 'secondary'
type UpdatedSubscription = Awaited<ReturnType<typeof renewAdminSubscription>>

interface RenewalModalState {
  sub: AdminSubscription
  mode: RenewalMode
}

interface RowAction {
  label: string
  icon: LucideIcon
  variant: ActionVariant
  onClick: () => void
}

type RenewalSubmission =
  | { kind: 'duration'; durationMonths: AdminSubscriptionManualDuration; reason?: string }
  | { kind: 'custom'; expiresAt: string; reason?: string }

const STATUS_LABELS: Record<StatusFilter, string> = {
  all:      'All',
  active:   'Active',
  expired:  'Expired',
  inactive: 'Inactive',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminSubscriptionsPage() {
  const [subs,         setSubs]         = useState<AdminSubscription[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState<StatusFilter>('all')
  const [mutatingIds,  setMutatingIds]  = useState<Set<string>>(new Set())
  const [confirmId,    setConfirmId]    = useState<string | null>(null)
  const [renewalModal, setRenewalModal] = useState<RenewalModalState | null>(null)

  useEffect(() => {
    let cancelled = false

    getAdminSubscriptions()
      .then((data) => {
        if (!cancelled) {
          setSubs(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load subscriptions.')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  async function handleAccessChange(sub: AdminSubscription) {
    const nextIsActive = !sub.isActive
    setConfirmId(null)
    setMutatingIds((prev) => new Set(prev).add(sub.id))
    setSubs((prev) => prev.map((item) => item.id === sub.id ? withRawActive(item, nextIsActive) : item))

    try {
      await setSubscriptionActive(sub.id, nextIsActive)
      toast.success(
        nextIsActive
          ? `${sub.userName ?? 'Subscription'} activated`
          : `${sub.userName ?? 'Subscription'} deactivated`,
      )
    } catch (err) {
      setSubs((prev) => prev.map((item) => item.id === sub.id ? sub : item))
      const message = getSubscriptionErrorMessage(err, 'Failed to update subscription.')
      toast.error(new Error(message), message)
    } finally {
      setMutatingIds((prev) => {
        const next = new Set(prev)
        next.delete(sub.id)
        return next
      })
    }
  }

  async function handleRenewalSubmit(
    modal: RenewalModalState,
    submission: RenewalSubmission,
  ): Promise<void> {
    setMutatingIds((prev) => new Set(prev).add(modal.sub.id))

    try {
      const updated =
        submission.kind === 'custom'
          ? await setAdminSubscriptionCustomExpiry(modal.sub.userId, submission.expiresAt, submission.reason)
          : modal.mode === 'renew'
            ? await renewAdminSubscription(modal.sub.userId, submission.durationMonths, submission.reason)
            : await extendAdminSubscription(modal.sub.userId, submission.durationMonths, submission.reason)

      setSubs((prev) => prev.map((item) => item.id === modal.sub.id ? mergeUpdatedSubscription(item, updated) : item))
      setRenewalModal(null)
      toast.success(getSubscriptionSuccessMessage(modal, submission))
    } finally {
      setMutatingIds((prev) => {
        const next = new Set(prev)
        next.delete(modal.sub.id)
        return next
      })
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return subs.filter((sub) => {
      const matchesStatus =
        filter === 'all' ||
        sub.effectiveStatus === filter
      const matchesSearch = matchesAdminSearch(q, [
        sub.userName,
        planLabel(sub.planId, sub.tier),
        sub.tier,
        sub.effectiveStatus,
        formatExpiry(sub.expiresAt),
        sub.isActive ? 'Active' : 'Inactive',
      ])
      return matchesStatus && matchesSearch
    })
  }, [subs, search, filter])

  const activeCount   = subs.filter((sub) => sub.effectiveStatus === 'active').length
  const expiredCount  = subs.filter((sub) => sub.effectiveStatus === 'expired').length
  const inactiveCount = subs.filter((sub) => sub.effectiveStatus === 'inactive').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subs.length} total · {activeCount} active · {expiredCount} expired · {inactiveCount} inactive
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <AdminTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search subscriptions…"
          className="sm:max-w-xs"
        />

        <div className="flex items-center gap-2">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={filterTabClass(filter === status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <LoadError message={loadError} />

      <div className="overflow-hidden rounded-xl border shadow-sm">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="hidden h-4 w-20 sm:block" />
                <Skeleton className="h-8 w-36 rounded-md" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
              <CreditCard className="size-7 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {subs.length === 0 ? 'No subscriptions yet' : 'No results found'}
              </p>
              {subs.length > 0 && (search || filter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                isMutating={mutatingIds.has(sub.id)}
                isConfirming={confirmId === sub.id}
                onAccessClick={() => setConfirmId(sub.id)}
                onRenew={() => {
                  setConfirmId(null)
                  setRenewalModal({ sub, mode: 'renew' })
                }}
                onExtend={() => {
                  setConfirmId(null)
                  setRenewalModal({ sub, mode: 'extend' })
                }}
                onSetExpiry={() => {
                  setConfirmId(null)
                  setRenewalModal({ sub, mode: 'set_expiry' })
                }}
                onConfirm={() => handleAccessChange(sub)}
                onCancel={() => setConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && (search || filter !== 'all') && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {subs.length} subscription{subs.length !== 1 ? 's' : ''}
        </p>
      )}

      {renewalModal && (
        <SubscriptionRenewalModal
          key={`${renewalModal.sub.id}-${renewalModal.mode}`}
          state={renewalModal}
          onClose={() => setRenewalModal(null)}
          onSubmit={(submission) => handleRenewalSubmit(renewalModal, submission)}
        />
      )}
    </div>
  )
}

// ── Subscription row ──────────────────────────────────────────────────────────

interface SubscriptionRowProps {
  sub: AdminSubscription
  isMutating: boolean
  isConfirming: boolean
  onAccessClick: () => void
  onRenew: () => void
  onExtend: () => void
  onSetExpiry: () => void
  onConfirm: () => void
  onCancel: () => void
}

function SubscriptionRow({
  sub,
  isMutating,
  isConfirming,
  onAccessClick,
  onRenew,
  onExtend,
  onSetExpiry,
  onConfirm,
  onCancel,
}: SubscriptionRowProps) {
  const expired = isExpiredDate(sub.expiresAt)
  const primaryAction = getPrimaryAction(sub, expired, { onAccessClick, onRenew, onExtend, onSetExpiry })
  const secondaryAction = getSecondaryAction(sub, expired, { onAccessClick })

  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{sub.userName ?? 'Unknown user'}</p>
          <p className="tabular-nums text-xs text-muted-foreground">
            Since {formatAdminDate(sub.startedAt)}
          </p>
        </div>

        <span className="hidden justify-center sm:flex">
          <Badge variant="secondary">
            {planLabel(sub.planId, sub.tier)}
          </Badge>
        </span>

        <span className="flex justify-center">
          <StatusBadge status={sub.effectiveStatus} />
        </span>

        <span className="hidden text-center text-xs text-muted-foreground tabular-nums sm:block">
          {formatExpiry(sub.expiresAt)}
        </span>

        <span className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton action={primaryAction} disabled={isMutating} />
            {secondaryAction && (
              <ActionButton action={secondaryAction} disabled={isMutating} />
            )}
          </div>
        </span>
      </div>

      {isConfirming && (
        <div className="flex items-center justify-between gap-4 border-t border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm">
            {sub.isActive ? (
              <>
                Deactivate subscription for{' '}
                <span className="font-semibold">{sub.userName ?? 'this user'}</span>?
              </>
            ) : (
              <>
                Activate <span className="font-semibold">Standard</span> subscription for{' '}
                <span className="font-semibold">{sub.userName ?? 'this user'}</span>?
              </>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isMutating}>Cancel</Button>
            <Button size="sm" onClick={onConfirm} disabled={isMutating}>
              {isMutating ? <Loader2 className="size-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({ action, disabled }: { action: RowAction; disabled: boolean }) {
  const Icon = action.icon

  return (
    <Button
      variant={action.variant}
      size="sm"
      disabled={disabled}
      onClick={action.onClick}
      className="text-xs"
    >
      <Icon className="size-3.5" />
      {disabled ? 'Working...' : action.label}
    </Button>
  )
}

function getPrimaryAction(
  sub: AdminSubscription,
  expired: boolean,
  handlers: {
    onAccessClick: () => void
    onRenew: () => void
    onExtend: () => void
    onSetExpiry: () => void
  },
): RowAction {
  if (expired) {
    return {
      label: 'Renew',
      icon: RefreshCw,
      variant: 'default',
      onClick: handlers.onRenew,
    }
  }

  if (!sub.isActive) {
    return {
      label: 'Activate',
      icon: Power,
      variant: 'default',
      onClick: handlers.onAccessClick,
    }
  }

  if (!sub.expiresAt) {
    return {
      label: 'Set Expiry',
      icon: CalendarClock,
      variant: 'default',
      onClick: handlers.onSetExpiry,
    }
  }

  return {
    label: 'Extend',
    icon: RefreshCw,
    variant: 'default',
    onClick: handlers.onExtend,
  }
}

function getSecondaryAction(
  sub: AdminSubscription,
  expired: boolean,
  handlers: { onAccessClick: () => void },
): RowAction | null {
  if (expired || !sub.isActive) return null

  return {
    label: 'Deactivate',
    icon: Ban,
    variant: 'outline',
    onClick: handlers.onAccessClick,
  }
}

// ── Renewal modal ─────────────────────────────────────────────────────────────

interface SubscriptionRenewalModalProps {
  state: RenewalModalState
  onClose: () => void
  onSubmit: (submission: RenewalSubmission) => Promise<void>
}

function SubscriptionRenewalModal({ state, onClose, onSubmit }: SubscriptionRenewalModalProps) {
  const [selection, setSelection] = useState<RenewalSelection>(
    state.mode === 'set_expiry' ? 'custom' : 1,
  )
  const [customDate, setCustomDate] = useState(getDefaultExpiryDate(state.sub))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setError(null)
    const trimmedReason = reason.trim()

    let submission: RenewalSubmission

    if (state.mode === 'set_expiry' || selection === 'custom') {
      const expiresAt = toEndOfDayIso(customDate)
      if (!expiresAt) {
        setError('Choose a valid future expiry date.')
        return
      }

      submission = {
        kind: 'custom',
        expiresAt,
        reason: trimmedReason || undefined,
      }
    } else {
      submission = {
        kind: 'duration',
        durationMonths: selection,
        reason: trimmedReason || undefined,
      }
    }

    setSaving(true)

    try {
      await onSubmit(submission)
    } catch (err) {
      setError(getSubscriptionErrorMessage(err, 'Failed to update subscription.'))
      setSaving(false)
      return
    }

    setSaving(false)
  }

  const isCustomOnly = state.mode === 'set_expiry'
  const title =
    state.mode === 'renew'
      ? 'Renew Subscription'
      : state.mode === 'extend'
        ? 'Extend Subscription'
        : 'Set Subscription Expiry'
  const submitLabel =
    isCustomOnly || selection === 'custom'
      ? 'Save Expiry'
      : state.mode === 'renew'
        ? 'Renew Subscription'
        : 'Extend Subscription'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border bg-background shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {state.sub.userName ?? 'Unknown user'} · {formatExpiry(state.sub.expiresAt)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {!isCustomOnly && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    { value: 1 as const, label: '1 Month' },
                    { value: 3 as const, label: '3 Months' },
                    { value: 6 as const, label: '6 Months' },
                    { value: 'custom' as const, label: 'Custom Date' },
                  ]).map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      disabled={saving}
                      onClick={() => setSelection(option.value)}
                      className={[
                        'rounded-lg border px-3 py-3 text-left text-sm transition-colors',
                        selection === option.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-background hover:bg-accent/50',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isCustomOnly || selection === 'custom') && (
              <div className="space-y-1.5">
                <label htmlFor="subscription-expiry-date" className="text-sm font-medium">
                  Expiry date
                </label>
                <Input
                  id="subscription-expiry-date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  disabled={saving}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="subscription-reason" className="text-sm font-medium">
                Reason
              </label>
              <textarea
                id="subscription-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={saving}
                placeholder="Optional note for the audit log"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function planLabel(planId: string, tier: string | null): string {
  const value = (tier ?? planId).toLowerCase()
  return value === 'free' ? 'Free' : 'Standard'
}

function withRawActive(sub: AdminSubscription, isActive: boolean): AdminSubscription {
  const effectiveStatus = getAdminSubscriptionEffectiveStatus({
    isActive,
    expiresAt: sub.expiresAt,
  })

  return {
    ...sub,
    isActive,
    effectiveStatus,
    isEntitled: effectiveStatus === 'active',
  }
}

function mergeUpdatedSubscription(
  sub: AdminSubscription,
  updated: UpdatedSubscription,
): AdminSubscription {
  const effectiveStatus = getAdminSubscriptionEffectiveStatus({
    isActive: updated.isActive,
    expiresAt: updated.expiresAt,
  })

  return {
    ...sub,
    planId: updated.tier ?? sub.planId,
    tier: updated.tier,
    isActive: updated.isActive,
    effectiveStatus,
    isEntitled: effectiveStatus === 'active',
    expiresAt: updated.expiresAt,
    durationMonths: updated.durationMonths,
  }
}

function StatusBadge({ status }: { status: AdminSubscription['effectiveStatus'] }) {
  if (status === 'active') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" />
        Active
      </Badge>
    )
  }

  if (status === 'expired') {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="size-3" />
        Expired
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <XCircle className="size-3" />
      Inactive
    </Badge>
  )
}

function isExpiredDate(expiresAt: string | null): boolean {
  if (!expiresAt) return false

  const date = new Date(expiresAt)
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now()
}

function formatExpiry(expiresAt: string | null): string {
  return expiresAt ? formatAdminDate(expiresAt) : 'No Expiry'
}

function getDefaultExpiryDate(sub: AdminSubscription): string {
  if (sub.expiresAt) {
    const existingDate = new Date(sub.expiresAt)
    if (!Number.isNaN(existingDate.getTime()) && existingDate.getTime() > Date.now()) {
      const existing = toDateInputValue(sub.expiresAt)
      if (existing) return existing
    }
  }

  const fallback = new Date()
  fallback.setMonth(fallback.getMonth() + 1)
  return toDateInputValue(fallback.toISOString())
}

function toDateInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toEndOfDayIso(dateValue: string): string | null {
  if (!dateValue) return null

  const date = new Date(`${dateValue}T23:59:59`)
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null
  return date.toISOString()
}

function formatDuration(months: AdminSubscriptionManualDuration): string {
  return months === 1 ? '1 month' : `${months} months`
}

function getSubscriptionSuccessMessage(
  modal: RenewalModalState,
  submission: RenewalSubmission,
): string {
  const label = modal.sub.userName ?? 'Subscription'

  if (submission.kind === 'custom') {
    return `Expiry updated for ${label}`
  }

  if (modal.mode === 'renew') {
    return `${label} renewed for ${formatDuration(submission.durationMonths)}`
  }

  return `${label} extended by ${formatDuration(submission.durationMonths)}`
}

function getSubscriptionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'SUBSCRIPTION_EXPIRED_RENEW_REQUIRED':
        return 'This subscription has expired and cannot be restored. Please renew the subscription first.'
      case 'SUBSCRIPTION_NO_EXPIRY_SET_CUSTOM_REQUIRED':
        return 'This subscription has no expiry date. Set a custom expiry instead.'
      case 'SUBSCRIPTION_INACTIVE_RESTORE_REQUIRED':
        return 'This subscription is inactive. Restore access before extending it.'
      case 'SUBSCRIPTION_NOT_EXPIRED_USE_EXTEND':
        return 'This subscription is still valid. Use Extend instead of Renew.'
      case 'INVALID_EXPIRES_AT':
        return 'Choose a valid future expiry date.'
      default:
        return error.message || fallback
    }
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}
