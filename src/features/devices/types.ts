/**
 * Phase G device-restriction types shared by browser and Edge Functions.
 *
 * Field names mirror the user_devices DB shape (snake_case → camelCase
 * via the service mappers in src/services/devicesApi.ts).
 */

export type DeviceKind = 'mobile' | 'desktop'

export interface UserDevice {
  id:           string
  userId:       string
  fingerprint:  string
  deviceKind:   DeviceKind
  userAgent:    string
  ip?:          string | null
  label?:       string | null
  isActive:     boolean
  firstSeenAt:  string
  lastSeenAt:   string
}

export interface RegisterDeviceBody {
  fingerprint: string
  deviceKind:  DeviceKind
  userAgent?:  string
}

/** register-device returns one of these. */
export type RegisterDeviceResponse =
  | { status: 'ok'; device: UserDevice }
  | { status: 'limit_reached'; devices: UserDevice[] }

export interface RevokeDeviceBody {
  deviceId: string
}
