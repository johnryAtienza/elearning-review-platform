import { useState, useEffect, useMemo } from 'react'
import { Users, Search, AlertTriangle, ShieldCheck, User } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAdminUsers,
  setUserRole,
  type AdminUser,
} from '@/services/admin.service'

type RoleFilter = 'all' | 'admin' | 'user'

// State for the inline role-change confirmation
interface RoleConfirm {
  userId: string
  newRole: 'user' | 'admin'
}

export function AdminUsersPage() {
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState<RoleFilter>('all')
  const [roleConfirm, setRoleConfirm] = useState<RoleConfirm | null>(null)
  const [togglingRole, setTogglingRole] = useState<Set<string>>(new Set())

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    getAdminUsers()
      .then((data) => { if (!cancelled) { setUsers(data); setLoading(false) } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load users.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // ── Role change ───────────────────────────────────────────────────────────────
  async function handleRoleChange(userId: string, newRole: 'user' | 'admin') {
    setRoleConfirm(null)
    setTogglingRole((prev) => new Set(prev).add(userId))
    try {
      await setUserRole(userId, newRole)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
      const user = users.find((u) => u.id === userId)
      toast.success(
        newRole === 'admin'
          ? `${user?.name ?? 'User'} promoted to Admin`
          : `${user?.name ?? 'User'} changed to User`,
      )
    } catch (err) {
      toast.error(err, 'Failed to update role.')
    } finally {
      setTogglingRole((prev) => { const s = new Set(prev); s.delete(userId); return s })
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  // ── Counts ───────────────────────────────────────────────────────────────────
  const adminCount = users.filter((u) => u.role === 'admin').length
  const subCount   = users.filter((u) => u.isSubscribed).length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''} · {subCount} Pro
          </p>
        </div>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'admin', 'user'] as RoleFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={filterTabClass(roleFilter === f)}
            >
              {f === 'all' ? 'All' : f === 'admin' ? 'Admins' : 'Users'}
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
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>User</span>
          <span className="text-center">Role</span>
          <span className="text-center">Subscription</span>
          <span className="hidden sm:block text-center">Joined</span>
        </div>

        {/* Skeletons */}
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-4 w-20 hidden sm:block" />
              </div>
            ))}
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
              <Users className="size-7 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {search || roleFilter !== 'all' ? 'No users match your filters' : 'No users yet'}
              </p>
              {(search || roleFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setRoleFilter('all') }}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

        ) : (
          <div className="divide-y">
            {filtered.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isTogglingRole={togglingRole.has(user.id)}
                isConfirmingRole={roleConfirm?.userId === user.id ? roleConfirm : null}
                onRoleClick={() =>
                  setRoleConfirm({ userId: user.id, newRole: user.role === 'admin' ? 'user' : 'admin' })
                }
                onRoleConfirm={() => handleRoleChange(user.id, roleConfirm!.newRole)}
                onRoleCancel={() => setRoleConfirm(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result count when filtering */}
      {!loading && (search || roleFilter !== 'all') && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ── UserRow ───────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: AdminUser
  isTogglingRole: boolean
  isConfirmingRole: RoleConfirm | null
  onRoleClick: () => void
  onRoleConfirm: () => void
  onRoleCancel: () => void
}

function UserRow({
  user, isTogglingRole, isConfirmingRole,
  onRoleClick, onRoleConfirm, onRoleCancel,
}: UserRowProps) {
  return (
    <div className="divide-y">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">

        {/* User info */}
        <div className="flex items-center gap-3 min-w-0">
          <Initials name={user.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
        </div>

        {/* Role — clickable to toggle */}
        <span className="flex justify-center">
          <button
            type="button"
            disabled={isTogglingRole}
            onClick={onRoleClick}
            title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
            className="rounded transition-opacity disabled:opacity-50"
          >
            {isTogglingRole ? (
              <Badge variant="secondary" className="opacity-60">…</Badge>
            ) : user.role === 'admin' ? (
              <Badge variant="pro" className="cursor-pointer hover:opacity-80 gap-1">
                <ShieldCheck className="size-3" />
                Admin
              </Badge>
            ) : (
              <Badge variant="secondary" className="cursor-pointer hover:opacity-80 gap-1">
                <User className="size-3" />
                User
              </Badge>
            )}
          </button>
        </span>

        {/* Subscription */}
        <span className="flex justify-center">
          {user.isSubscribed ? (
            <Badge variant="success">Pro</Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </span>

        {/* Joined date */}
        <span className="hidden sm:block text-xs text-muted-foreground text-center tabular-nums">
          {formatDate(user.createdAt)}
        </span>
      </div>

      {/* Inline role-change confirmation */}
      {isConfirmingRole && (
        <div className="flex items-center justify-between gap-4 border-t border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm">
            {isConfirmingRole.newRole === 'admin' ? (
              <>
                Promote <span className="font-semibold">{user.name}</span> to{' '}
                <span className="font-semibold text-primary">Admin</span>?
              </>
            ) : (
              <>
                Demote <span className="font-semibold">{user.name}</span> to{' '}
                <span className="font-semibold">User</span>?
              </>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onRoleCancel}>Cancel</Button>
            <Button
              size="sm"
              variant={isConfirmingRole.newRole === 'admin' ? 'default' : 'outline'}
              onClick={onRoleConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary select-none">
      {initials || '?'}
    </span>
  )
}

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
