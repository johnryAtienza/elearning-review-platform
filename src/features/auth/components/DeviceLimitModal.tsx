import { useState } from 'react'
import { Smartphone, Laptop, X, Loader2, AlertTriangle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { revokeDevice } from '@/services/devicesApi'
import type { UserDevice } from '@/features/devices/types'
import { cn } from '@/utils/cn'

interface DeviceLimitModalProps {
  /** Active devices currently using this account (mobile + desktop, 1 each max). */
  devices: UserDevice[]
  /**
   * Called when the user has successfully revoked a device and the app
   * should retry whatever auth flow was blocked (typically re-submit the
   * login form on LoginPage).
   */
  onRevoked: () => void
  /** Close the modal without revoking — user gives up. */
  onCancel: () => void
}

/**
 * Phase G — appears when register-device returns status='limit_reached'.
 *
 * Lists the user's current active devices and lets them sign one out.
 * After a successful revoke, the parent retries the original auth flow.
 */
export function DeviceLimitModal({ devices, onRevoked, onCancel }: DeviceLimitModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError]   = useState<string | null>(null)

  async function handleRevoke(deviceId: string) {
    setBusyId(deviceId)
    setError(null)
    try {
      await revokeDevice(deviceId)
      onRevoked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out that device.')
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busyId ? undefined : onCancel} />

      <div className="relative w-full max-w-md rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 flex items-start gap-3 border-b px-6 py-4">
          <div className="rounded-full bg-warning/15 p-2 shrink-0">
            <AlertTriangle className="size-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight">
              You're signed in on too many devices
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Each account is limited to 1 mobile device and 1 laptop/desktop.
              Sign out an existing device to continue here.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={!!busyId}
            aria-label="Close"
            className="rounded p-1 -mt-0.5 -mr-1 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Device list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No active devices found. Try logging in again.
            </p>
          ) : (
            devices.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                isBusy={busyId === d.id}
                disabled={!!busyId && busyId !== d.id}
                onRevoke={() => handleRevoke(d.id)}
              />
            ))
          )}

          {error && (
            <p className="text-sm text-destructive pt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onCancel} disabled={!!busyId}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

interface DeviceRowProps {
  device: UserDevice
  isBusy: boolean
  disabled: boolean
  onRevoke: () => void
}

function DeviceRow({ device, isBusy, disabled, onRevoke }: DeviceRowProps) {
  const Icon = device.deviceKind === 'mobile' ? Smartphone : Laptop
  const browser = uaShort(device.userAgent)
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border bg-card p-3 transition-opacity',
      disabled && 'opacity-50',
    )}>
      <div className="rounded-md bg-muted p-2 shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium capitalize">{device.deviceKind}</p>
          <Badge variant="outline" className="text-[10px]">{browser}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Last seen {new Date(device.lastSeenAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
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
    </div>
  )
}

// ── User-Agent → short browser label ─────────────────────────────────────────

function uaShort(ua: string): string {
  if (!ua) return 'Unknown'
  if (/edg\//i.test(ua))         return 'Edge'
  if (/chrome\//i.test(ua))      return 'Chrome'
  if (/safari\//i.test(ua) && /version\//i.test(ua)) return 'Safari'
  if (/firefox\//i.test(ua))     return 'Firefox'
  if (/opera|opr\//i.test(ua))   return 'Opera'
  return 'Browser'
}
