/**
 * devicesApi.ts
 *
 * Phase G — Netflix-style device restriction.
 *
 * Three operations:
 *  - registerCurrentDevice  → calls register-device Edge Function
 *  - listMyDevices          → fetches user_devices via Supabase (RLS-scoped)
 *  - revokeDevice           → calls revoke-device Edge Function
 *
 * `DeviceLimitError` is a typed throw used by the auth flow:
 * when registerCurrentDevice fails with status='limit_reached',
 * authStore re-throws this error so LoginPage / RegisterPage can mount
 * DeviceLimitModal with the current device list.
 */

import config from '@/config'
import { supabase } from './supabaseClient'
import { getDeviceIdentity } from '@/features/devices/services/fingerprint'
import type {
  DeviceKind,
  RegisterDeviceResponse,
  UserDevice,
} from '@/features/devices/types'

// ── Typed errors ─────────────────────────────────────────────────────────────

/**
 * Thrown when register-device returns status='limit_reached'.
 * Carries the user's current active devices so the UI can render a
 * "Sign out which device?" list.
 */
export class DeviceLimitError extends Error {
  readonly devices: UserDevice[]
  constructor(devices: UserDevice[]) {
    super('Device limit reached. Sign out another device first.')
    this.name = 'DeviceLimitError'
    this.devices = devices
  }
}

// ── Raw row → app shape ──────────────────────────────────────────────────────

interface DeviceRow {
  id:             string
  user_id:        string
  fingerprint:    string
  device_kind:    DeviceKind
  user_agent:     string
  ip:             string | null
  label:          string | null
  is_active:      boolean
  first_seen_at:  string
  last_seen_at:   string
}

function toUserDevice(row: DeviceRow): UserDevice {
  return {
    id:           row.id,
    userId:       row.user_id,
    fingerprint:  row.fingerprint,
    deviceKind:   row.device_kind,
    userAgent:    row.user_agent,
    ip:           row.ip,
    label:        row.label,
    isActive:     row.is_active,
    firstSeenAt:  row.first_seen_at,
    lastSeenAt:   row.last_seen_at,
  }
}

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Compute the current device identity and register it on the server.
 *
 * On success: resolves silently.
 * On limit_reached: throws `DeviceLimitError` with the current device list.
 * On other failure (network, fingerprint load): logs + resolves silently
 * so login flow isn't blocked by a transient FP failure.
 */
export async function registerCurrentDevice(): Promise<void> {
  if (config.api.useMock) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return  // Not logged in — nothing to register.

  let identity
  try {
    identity = await getDeviceIdentity()
  } catch (err) {
    // FingerprintJS failed — don't block the user.
    console.warn('[devicesApi] FingerprintJS failed; skipping device registration:', err)
    return
  }

  const { data, error } = await supabase.functions.invoke<RegisterDeviceResponse>('register-device', {
    body: {
      fingerprint: identity.fingerprint,
      deviceKind:  identity.deviceKind,
      userAgent:   identity.userAgent,
    },
  })

  if (error) {
    console.error('[devicesApi] register-device error:', error)
    return  // Soft-fail. User can still browse; revisit on next boot.
  }
  if (!data) return

  if (data.status === 'limit_reached') {
    throw new DeviceLimitError(data.devices)
  }
  // status === 'ok' — silently registered.
}

/** Fetch all of the current user's devices (active and inactive). */
export async function listMyDevices(): Promise<UserDevice[]> {
  if (config.api.useMock) return []

  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('[devicesApi] listMyDevices error:', error)
    return []
  }
  return ((data ?? []) as DeviceRow[]).map(toUserDevice)
}

/** Revoke a device by id. The caller must own it (Edge Function checks). */
export async function revokeDevice(deviceId: string): Promise<void> {
  if (config.api.useMock) return

  const { error } = await supabase.functions.invoke<{ status: string }>('revoke-device', {
    body: { deviceId },
  })
  if (error) throw new Error(error.message ?? 'Failed to sign out device.')
}
