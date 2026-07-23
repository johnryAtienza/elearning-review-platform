import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Users,
  ShieldCheck,
  User,
  Pencil,
  MoreVertical,
  Monitor,
  Smartphone,
  RotateCcw,
  Plus,
  Save,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AdminTableHeader, AdminTableSearch, filterTabClass, ADMIN_ROW_BASE, Tip, LoadError, formatAdminDate,
  matchesAdminSearch,
  type ColConfig,
} from '../../features/admin/components/AdminTable'
import {
  createAdminUser,
  getAdminUsers,
  resetUserDevices,
  setUserRole,
  updateAdminUser,
  type AdminDeviceResetKind,
  type AdminUser,
} from '@s-class/api/admin.service'

// ── Column layout ─────────────────────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[1fr_6rem_8rem_7rem_4.5rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'User' },
  { label: 'Role',         center: true },
  { label: 'Subscription', center: true },
  { label: 'Joined',       center: true, smOnly: true },
  { label: '' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleFilter = 'all' | 'admin' | 'user'

interface RoleConfirm {
  userId: string
  newRole: 'user' | 'admin'
}

interface DeviceResetConfirm {
  userId: string
  deviceKind: AdminDeviceResetKind
}

interface UserFormDraft {
  userId: string | null
  email: string
  password: string
  firstName: string
  lastName: string
  mobileNumber: string
  school: string
  schoolId: string
  role: 'user' | 'admin'
}

interface UserModalState {
  mode: 'create' | 'edit'
  draft: UserFormDraft
}

export function AdminUsersPage() {
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState<RoleFilter>('all')
  const [roleConfirm, setRoleConfirm] = useState<RoleConfirm | null>(null)
  const [togglingRole, setTogglingRole] = useState<Set<string>>(new Set())
  const [userModal,         setUserModal]         = useState<UserModalState | null>(null)
  const [savingEdit,        setSavingEdit]        = useState(false)
  const [editSaveAttempted, setEditSaveAttempted] = useState(false)
  const [resetMenuUserId,   setResetMenuUserId]   = useState<string | null>(null)
  const [resetConfirm,      setResetConfirm]      = useState<DeviceResetConfirm | null>(null)
  const [resettingDevice,   setResettingDevice]   = useState<string | null>(null)

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

  // ── Edit user ─────────────────────────────────────────────────────────────────
  function openCreateUserModal() {
    setEditSaveAttempted(false)
    setResetMenuUserId(null)
    setResetConfirm(null)
    setRoleConfirm(null)
    setUserModal({
      mode: 'create',
      draft: {
        userId: null,
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        mobileNumber: '',
        school: '',
        schoolId: '',
        role: 'user',
      },
    })
  }

  function openEditUserModal(user: AdminUser) {
    setEditSaveAttempted(false)
    setResetMenuUserId(null)
    setResetConfirm(null)
    setRoleConfirm(null)
    setUserModal({
      mode: 'edit',
      draft: {
        userId: user.id,
        email: user.email ?? '',
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber,
        school: user.school,
        schoolId: user.schoolId,
        role: user.role,
      },
    })
  }

  function closeUserModal() {
    if (savingEdit) return
    setUserModal(null)
    setEditSaveAttempted(false)
  }

  async function handleUserModalSave() {
    setEditSaveAttempted(true)
    if (!userModal) return

    const { draft, mode } = userModal
    if (
      !draft.firstName.trim() ||
      !draft.lastName.trim() ||
      (mode === 'create' && (!draft.email.trim() || !draft.password.trim()))
    ) {
      return
    }

    setSavingEdit(true)
    try {
      if (mode === 'create') {
        const created = await createAdminUser({
          email:        draft.email.trim(),
          password:     draft.password,
          firstName:    draft.firstName.trim(),
          lastName:     draft.lastName.trim(),
          mobileNumber: draft.mobileNumber.trim(),
          school:       draft.school.trim(),
          schoolId:     draft.schoolId.trim(),
          role:         draft.role,
        })
        setUsers((prev) => [created, ...prev])
        toast.success(`${created.name} created successfully`)
      } else if (draft.userId) {
        await updateAdminUser(draft.userId, {
          firstName:    draft.firstName.trim(),
          lastName:     draft.lastName.trim(),
          mobileNumber: draft.mobileNumber.trim(),
          school:       draft.school.trim(),
          schoolId:     draft.schoolId.trim(),
        })
        setUsers((prev) =>
          prev.map((u) =>
            u.id === draft.userId
              ? {
                  ...u,
                  firstName:    draft.firstName.trim(),
                  lastName:     draft.lastName.trim(),
                  mobileNumber: draft.mobileNumber.trim(),
                  school:       draft.school.trim(),
                  schoolId:     draft.schoolId.trim(),
                  name:         `${draft.firstName} ${draft.lastName}`.trim(),
                }
              : u,
          ),
        )
        toast.success('User updated successfully')
      }
      setUserModal(null)
      setEditSaveAttempted(false)
    } catch (err) {
      toast.error(err, userModal.mode === 'create' ? 'Failed to create user.' : 'Failed to update user.')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Device reset ─────────────────────────────────────────────────────────────
  function requestDeviceReset(userId: string, deviceKind: AdminDeviceResetKind) {
    setResetMenuUserId(null)
    setResetConfirm({ userId, deviceKind })
  }

  async function handleDeviceReset() {
    if (!resetConfirm) return
    const { userId, deviceKind } = resetConfirm
    const key = `${userId}:${deviceKind}`
    setResetConfirm(null)
    setResettingDevice(key)
    try {
      const result = await resetUserDevices(userId, deviceKind)
      const user = users.find((u) => u.id === userId)
      toast.success(
        `${deviceResetLabel(deviceKind)} reset for ${user?.name ?? 'user'} (${result.resetCount} active ${result.resetCount === 1 ? 'row' : 'rows'} deactivated).`,
      )
    } catch (err) {
      toast.error(err, 'Failed to reset device slot.')
    } finally {
      setResettingDevice(null)
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesSearch = matchesAdminSearch(q, [
        u.name,
        u.email,
        u.role,
        u.isSubscribed ? 'Standard Subscribed' : 'Free',
        u.mobileNumber,
      ])
      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  // ── Counts ───────────────────────────────────────────────────────────────────
  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={openCreateUserModal} disabled={loading || savingEdit}>
          <Plus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <AdminTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search users…"
          className="sm:max-w-xs"
        />

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
      <LoadError message={loadError} />

      {/* ── Table ── */}
      <div className="rounded-xl border shadow-sm overflow-hidden">

        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

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
                <Skeleton className="size-6 rounded" />
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
                {users.length === 0 ? 'No users yet' : 'No results found'}
              </p>
              {users.length > 0 && (search || roleFilter !== 'all') && (
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
                onRoleClick={() => {
                  setUserModal(null)
                  setResetMenuUserId(null)
                  setResetConfirm(null)
                  setRoleConfirm({ userId: user.id, newRole: user.role === 'admin' ? 'user' : 'admin' })
                }}
                onRoleConfirm={() => handleRoleChange(user.id, roleConfirm!.newRole)}
                onRoleCancel={() => setRoleConfirm(null)}
                onEditClick={() => openEditUserModal(user)}
                resetMenuOpen={resetMenuUserId === user.id}
                onResetMenuToggle={() => {
                  setUserModal(null)
                  setRoleConfirm(null)
                  setResetConfirm(null)
                  setResetMenuUserId((current) => current === user.id ? null : user.id)
                }}
                resetConfirm={resetConfirm?.userId === user.id ? resetConfirm : null}
                onResetRequest={(deviceKind) => requestDeviceReset(user.id, deviceKind)}
                onResetConfirm={handleDeviceReset}
                onResetCancel={() => setResetConfirm(null)}
                isResetting={resettingDevice?.startsWith(`${user.id}:`) ?? false}
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

      {userModal && (
        <UserFormModal
          mode={userModal.mode}
          draft={userModal.draft}
          saving={savingEdit}
          saveAttempted={editSaveAttempted}
          onChange={(field, value) => setUserModal((prev) => prev ? {
            ...prev,
            draft: { ...prev.draft, [field]: value },
          } : prev)}
          onSave={handleUserModalSave}
          onClose={closeUserModal}
        />
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
  onEditClick: () => void
  resetMenuOpen: boolean
  onResetMenuToggle: () => void
  resetConfirm: DeviceResetConfirm | null
  onResetRequest: (deviceKind: AdminDeviceResetKind) => void
  onResetConfirm: () => void
  onResetCancel: () => void
  isResetting: boolean
}

function UserRow({
  user, isTogglingRole, isConfirmingRole,
  onRoleClick, onRoleConfirm, onRoleCancel,
  onEditClick,
  resetMenuOpen, onResetMenuToggle, resetConfirm, onResetRequest, onResetConfirm, onResetCancel, isResetting,
}: UserRowProps) {
  const resetActionRef = useRef<HTMLDivElement | null>(null)
  const resetMenuRef = useRef<HTMLDivElement | null>(null)
  const resetButtonRef = useRef<HTMLButtonElement | null>(null)
  const [resetMenuPosition, setResetMenuPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  })

  useEffect(() => {
    if (!resetMenuOpen) return

    function updateMenuPosition() {
      const button = resetButtonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const menuHeight = 144
      const nextTop = rect.bottom + menuHeight + 8 > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - 8)
        : rect.bottom + 8

      setResetMenuPosition({
        top: nextTop,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [resetMenuOpen])

  useEffect(() => {
    if (!resetMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && resetActionRef.current?.contains(target)) return
      if (target instanceof Node && resetMenuRef.current?.contains(target)) return
      onResetMenuToggle()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onResetMenuToggle, resetMenuOpen])

  return (
    <div className="divide-y">
      <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>

        {/* User info */}
        <div className="flex items-center gap-3 min-w-0">
          <Initials name={user.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
            {user.mobileNumber && (
              <p className="text-xs text-muted-foreground truncate">{user.mobileNumber}</p>
            )}
          </div>
        </div>

        {/* Role — clickable to toggle */}
        <span className="flex justify-center">
          <Tip label={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}>
            <button
              type="button"
              disabled={isTogglingRole}
              onClick={onRoleClick}
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
          </Tip>
        </span>

        {/* Subscription — read-only */}
        <span className="flex justify-center">
          {user.isSubscribed ? (
            <Badge variant="success">Standard</Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </span>

        {/* Joined date */}
        <span className="hidden sm:block text-xs text-muted-foreground text-center tabular-nums">
          {formatAdminDate(user.createdAt)}
        </span>

        {/* Row actions */}
        <div ref={resetActionRef} className="relative flex items-center justify-end gap-1">
          <Tip label="Edit user">
            <button
              type="button"
              onClick={onEditClick}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="size-3.5" />
            </button>
          </Tip>
          <Tip label="Device reset actions" align="right">
            <button
              ref={resetButtonRef}
              type="button"
              onClick={onResetMenuToggle}
              disabled={isResetting}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <MoreVertical className="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>

      {resetMenuOpen && createPortal(
        <div
          ref={resetMenuRef}
          className="fixed z-[70] w-60 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ top: resetMenuPosition.top, right: resetMenuPosition.right }}
        >
          <ResetMenuItem
            icon={Monitor}
            label="Reset Desktop Device"
            onClick={() => onResetRequest('desktop')}
          />
          <ResetMenuItem
            icon={Smartphone}
            label="Reset Mobile Device"
            onClick={() => onResetRequest('mobile')}
          />
          <ResetMenuItem
            icon={RotateCcw}
            label="Reset All Devices"
            onClick={() => onResetRequest('all')}
          />
        </div>,
        document.body,
      )}

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

      {resetConfirm && (
        <div className="flex items-center justify-between gap-4 border-t border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm">
            {deviceResetConfirmMessage(user.name, resetConfirm.deviceKind)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onResetCancel}>Cancel</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onResetConfirm}
              className="text-destructive hover:text-destructive"
            >
              Confirm reset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserFormModal({
  mode,
  draft,
  saving,
  saveAttempted,
  onChange,
  onSave,
  onClose,
}: {
  mode: 'create' | 'edit'
  draft: UserFormDraft
  saving: boolean
  saveAttempted: boolean
  onChange: (field: keyof Omit<UserFormDraft, 'userId'>, value: string) => void
  onSave: () => void
  onClose: () => void
}) {
  const isCreate = mode === 'create'
  const title = isCreate ? 'Add User' : 'Edit User'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    onSave()
  }

  function closeOnEscape(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-edit-modal-title"
        onSubmit={handleSubmit}
        onKeyDown={closeOnEscape}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2 id="user-edit-modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isCreate ? 'Create a login account for a new user.' : 'Update profile information for this user.'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {isCreate && (
            <>
              <UserModalField
                label="Email"
                value={draft.email}
                onChange={(value) => onChange('email', value)}
                placeholder="student@example.com"
                disabled={saving}
                required
                invalid={saveAttempted && !draft.email.trim()}
              />
              <UserModalField
                label="Temporary password"
                value={draft.password}
                onChange={(value) => onChange('password', value)}
                placeholder="At least 8 characters"
                disabled={saving}
                required
                invalid={saveAttempted && !draft.password.trim()}
                type="password"
              />
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UserModalField
              label="First name"
              value={draft.firstName}
              onChange={(value) => onChange('firstName', value)}
              placeholder="First name"
              disabled={saving}
              required
              invalid={saveAttempted && !draft.firstName.trim()}
            />
            <UserModalField
              label="Last name"
              value={draft.lastName}
              onChange={(value) => onChange('lastName', value)}
              placeholder="Last name"
              disabled={saving}
              required
              invalid={saveAttempted && !draft.lastName.trim()}
            />
          </div>

          <UserModalField
            label="Mobile number"
            value={draft.mobileNumber}
            onChange={(value) => onChange('mobileNumber', value)}
            placeholder="+63 9XX XXX XXXX"
            disabled={saving}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UserModalField
              label="School"
              value={draft.school}
              onChange={(value) => onChange('school', value)}
              placeholder="University / school"
              disabled={saving}
            />
            <UserModalField
              label="School ID"
              value={draft.schoolId}
              onChange={(value) => onChange('schoolId', value)}
              placeholder="Student ID"
              disabled={saving}
            />
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <label htmlFor="admin-user-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="admin-user-role"
                value={draft.role}
                onChange={(e) => onChange('role', e.target.value)}
                disabled={saving}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              !draft.firstName.trim() ||
              !draft.lastName.trim() ||
              (isCreate && (!draft.email.trim() || !draft.password.trim()))
            }
          >
            <Save className="mr-2 size-4" />
            {saving ? 'Saving...' : isCreate ? 'Create user' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function UserModalField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required = false,
  invalid = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled: boolean
  required?: boolean
  invalid?: boolean
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
      />
      {invalid && (
        <p className="text-xs text-destructive">{label} is required.</p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ResetMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  )
}

function deviceResetLabel(deviceKind: AdminDeviceResetKind): string {
  if (deviceKind === 'desktop') return 'Desktop device slot'
  if (deviceKind === 'mobile') return 'Mobile device slot'
  return 'All device slots'
}

function deviceResetConfirmMessage(userName: string, deviceKind: AdminDeviceResetKind): string {
  if (deviceKind === 'desktop') {
    return `Reset the active desktop device for ${userName}? This deactivates the desktop slot and keeps the old device row for audit history.`
  }
  if (deviceKind === 'mobile') {
    return `Reset the active mobile device for ${userName}? This deactivates the mobile slot and keeps the old device row for audit history.`
  }
  return `Reset all active devices for ${userName}? This deactivates desktop and mobile slots and keeps old device rows for audit history.`
}

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
