import { useState, useEffect, useMemo } from 'react'
import { CreditCard, Search, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAdminSubscriptions,
  setSubscriptionActive,
  type AdminSubscription,
} from '@/services/admin.service'

type StatusFilter = 'all' | 'active' | 'inactive'

export function AdminSubscriptionsPage() {
  const [subs,      setSubs]      = useState<AdminSubscription[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<StatusFilter>('all')
  const [toggling,  setToggling]  = useState<Set<string>>(new Set())

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    getAdminSubscriptions()
      .then((data) => { if (!cancelled) { setSubs(data); setLoading(false) } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load subscriptions.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // ── Toggle active ─────────────────────────────────────────────────────────────
  async function handleToggle(sub: AdminSubscription) {
    const next = !sub.isActive
    setToggling((prev) => new Set(prev).add(sub.id))
    // Optimistic update
    setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, isActive: next } : s))
    try {
      await setSubscriptionActive(sub.id, next)
      toast.success(
        next
          ? `${sub.userName ?? 'Subscription'} activated`
          : `${sub.userName ?? 'Subscription'} deactivated`,
      )
    } catch (err) {
      // Revert on failure
      setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, isActive: sub.isActive } : s))
      toast.error(err, 'Failed to update subscription.')
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(sub.id); return s })
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subs.filter((s) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'active' && s.isActive) ||
        (filter === 'inactive' && !s.isActive)
      const matchesSearch = !q || (s.userName ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [subs, search, filter])

  // ── Counts ───────────────────────────────────────────────────────────────────
  const activeCount   = subs.filter((s) => s.isActive).length
  const inactiveCount = subs.length - activeCount

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {subs.length} total · {activeCount} active · {inactiveCount} inactive
        </p>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filterTabClass(filter === f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Load error ── */}
      {loadError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>User</span>
          <span className="hidden sm:block text-center">Plan</span>
          <span className="text-center">Status</span>
          <span className="hidden sm:block text-center">Expires</span>
          <span className="text-center">Toggle</span>
        </div>

        {/* Skeletons */}
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full hidden sm:block" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 hidden sm:block" />
                <Skeleton className="h-7 w-20 rounded-md" />
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
                {search || filter !== 'all' ? 'No subscriptions match your filters' : 'No subscriptions yet'}
              </p>
              {(search || filter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setFilter('all') }}
                  className="text-xs text-primary hover:underline mt-1"
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
                isToggling={toggling.has(sub.id)}
                onToggle={() => handleToggle(sub)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      {!loading && (search || filter !== 'all') && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {subs.length} subscription{subs.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* SQL note for toggle to work */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        <strong>Required migration:</strong> The toggle requires an admin UPDATE policy on{' '}
        <code className="font-mono">subscriptions</code>. Run in Supabase SQL editor:
        <pre className="mt-1.5 font-mono whitespace-pre-wrap break-all">
          {`CREATE POLICY "subscriptions: admin updates all"\n  ON public.subscriptions FOR UPDATE\n  USING (public.is_admin());`}
        </pre>
      </div>
    </div>
  )
}

// ── SubscriptionRow ───────────────────────────────────────────────────────────

interface SubscriptionRowProps {
  sub: AdminSubscription
  isToggling: boolean
  onToggle: () => void
}

function SubscriptionRow({ sub, isToggling, onToggle }: SubscriptionRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">

      {/* User */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{sub.userName ?? 'Unknown user'}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Since {formatDate(sub.startedAt)}
        </p>
      </div>

      {/* Plan */}
      <span className="hidden sm:flex justify-center">
        <Badge variant="secondary" className="capitalize">
          {sub.planId}
        </Badge>
      </span>

      {/* Status */}
      <span className="flex justify-center">
        {sub.isActive ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="size-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="size-3" />
            Inactive
          </Badge>
        )}
      </span>

      {/* Expires */}
      <span className="hidden sm:block text-xs text-muted-foreground text-center tabular-nums">
        {sub.expiresAt ? formatDate(sub.expiresAt) : '—'}
      </span>

      {/* Toggle */}
      <span className="flex justify-center">
        <Button
          variant={sub.isActive ? 'outline' : 'default'}
          size="sm"
          disabled={isToggling}
          onClick={onToggle}
          className="text-xs"
        >
          {isToggling ? '…' : sub.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </span>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function filterTabClass(active: boolean): string {
  return [
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ].join(' ')
}
