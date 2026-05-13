import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Laptop, ChevronLeft, Loader2, LogOut, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { listMyDevices, revokeDevice } from '@/services/devicesApi'
import { getDeviceIdentity } from '@/features/devices/services/fingerprint'
import { ROUTES } from '@/constants/routes'
import { toast } from '@/lib/toast'
import { cn } from '@/utils/cn'
import type { UserDevice } from '@/features/devices/types'

/**
 * /profile/devices — Phase G device management page.
 *
 * Shows the current user's active devices (and recently-revoked ones for
 * context). Lets the user sign out any device, including from the current
 * one. The "current device" is marked so the user doesn't accidentally
 * sign themselves out without realising.
 */
export function DevicesPage() {
  const [devices,       setDevices]       = useState<UserDevice[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState<string | null>(null)
  const [revokingId,    setRevokingId]    = useState<string | null>(null)
  const [thisFingerprint, setThisFingerprint] = useState<string | null>(null)

  // Identify the current device so we can flag it in the list.
  useEffect(() => {
    let cancelled = false
    getDeviceIdentity()
      .then((id) => { if (!cancelled) setThisFingerprint(id.fingerprint) })
      .catch(() => { /* non-fatal */ })
    return () => { cancelled = true }
  }, [])

  function reload() {
    setLoading(true)
    setLoadError(null)
    listMyDevices()
      .then(setDevices)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load your devices.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  async function handleRevoke(device: UserDevice) {
    setRevokingId(device.id)
    try {
      await revokeDevice(device.id)
      setDevices((prev) =>
        prev.map((d) => d.id === device.id ? { ...d, isActive: false } : d),
      )
      toast.success(`Signed out ${device.deviceKind} device`)
    } catch (err) {
      toast.error(err, 'Failed to sign out device.')
    } finally {
      setRevokingId(null)
    }
  }

  const active   = devices.filter((d) => d.isActive)
  const inactive = devices.filter((d) => !d.isActive).slice(0, 10)

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-8">
      <Link
        to={ROUTES.PROFILE}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to profile
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Account security
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Active devices</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Each account is limited to <span className="font-medium text-foreground">1 mobile + 1 laptop/desktop</span> at a time.
          Sign out a device to free up the slot.
        </p>
      </header>

      {loadError && <ErrorMessage message={loadError} />}

      {/* Active devices */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Active
        </h2>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : active.length === 0 ? (
          <EmptyActiveDevices />
        ) : (
          <ul className="space-y-2">
            {active.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                isCurrent={device.fingerprint === thisFingerprint}
                isBusy={revokingId === device.id}
                disabled={!!revokingId && revokingId !== device.id}
                onRevoke={() => handleRevoke(device)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Inactive (recent history) */}
      {!loading && inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recently signed out
          </h2>
          <ul className="space-y-2 opacity-70">
            {inactive.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border bg-card/50 p-3">
                <div className="rounded-md bg-muted p-2 shrink-0">
                  {d.deviceKind === 'mobile'
                    ? <Smartphone className="size-4 text-muted-foreground" />
                    : <Laptop     className="size-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm capitalize">{d.deviceKind} · {uaShort(d.userAgent)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Last seen {new Date(d.lastSeenAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── DeviceRow ────────────────────────────────────────────────────────────────

interface DeviceRowProps {
  device: UserDevice
  isCurrent: boolean
  isBusy: boolean
  disabled: boolean
  onRevoke: () => void
}

function DeviceRow({ device, isCurrent, isBusy, disabled, onRevoke }: DeviceRowProps) {
  return (
    <li className={cn(
      'flex items-center gap-3 rounded-xl border bg-card p-4 transition-opacity',
      disabled && 'opacity-50',
    )}>
      <div className={cn(
        'rounded-md p-2 shrink-0',
        isCurrent ? 'bg-primary/15' : 'bg-muted',
      )}>
        {device.deviceKind === 'mobile'
          ? <Smartphone className={cn('size-4', isCurrent ? 'text-primary' : 'text-muted-foreground')} />
          : <Laptop     className={cn('size-4', isCurrent ? 'text-primary' : 'text-muted-foreground')} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium capitalize">{device.deviceKind}</p>
          <Badge variant="outline" className="text-[10px]">{uaShort(device.userAgent)}</Badge>
          {isCurrent && <Badge variant="pro" className="text-[10px]">This device</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          First seen {new Date(device.firstSeenAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          {' · '}
          Last {new Date(device.lastSeenAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onRevoke}
        disabled={disabled || isBusy}
        className="shrink-0 text-destructive hover:text-destructive"
      >
        {isBusy
          ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          : <LogOut    className="size-3.5 mr-1.5" />}
        Sign out
      </Button>
    </li>
  )
}

function EmptyActiveDevices() {
  return (
    <div className="rounded-xl border bg-card p-8 flex items-center gap-3">
      <AlertCircle className="size-5 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground">
        No active devices. Log in again from a phone or laptop to register one.
      </p>
    </div>
  )
}

function uaShort(ua: string): string {
  if (!ua) return 'Unknown'
  if (/edg\//i.test(ua))         return 'Edge'
  if (/chrome\//i.test(ua))      return 'Chrome'
  if (/safari\//i.test(ua) && /version\//i.test(ua)) return 'Safari'
  if (/firefox\//i.test(ua))     return 'Firefox'
  if (/opera|opr\//i.test(ua))   return 'Opera'
  return 'Browser'
}
