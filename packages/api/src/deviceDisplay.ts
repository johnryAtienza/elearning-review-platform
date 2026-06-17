import type { UserDevice } from '@s-class/types/devices'

const DATE_LOCALE = 'en-PH'

export function getDeviceName(device: UserDevice): string {
  const label = device.label?.trim()
  if (label) return label
  return getDeviceFallbackName(device.deviceKind)
}

export function getDeviceFallbackName(deviceKind: UserDevice['deviceKind']): string {
  return deviceKind === 'mobile' ? 'Mobile device' : 'Desktop device'
}

export function getDeviceMetaLabel(userAgent: string | null | undefined): string {
  const browser = getBrowserLabel(userAgent)
  const os = getOsLabel(userAgent)
  return [browser, os].filter(Boolean).join(' · ')
}

export function getBrowserLabel(userAgent: string | null | undefined): string | null {
  const ua = userAgent?.trim() ?? ''
  if (!ua) return null
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/firefox\//i.test(ua)) return 'Firefox'
  if (/chrome\/|crios\//i.test(ua)) return 'Chrome'
  if (/safari\//i.test(ua) && /version\//i.test(ua)) return 'Safari'
  return 'Browser'
}

export function getOsLabel(userAgent: string | null | undefined): string | null {
  const ua = userAgent?.trim() ?? ''
  if (!ua) return null
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/mac os x|macintosh|mac_powerpc/i.test(ua)) return 'macOS'
  if (/windows nt/i.test(ua)) return 'Windows'
  if (/linux/i.test(ua)) return 'Linux'
  return null
}

export function formatDeviceFirstSeen(value: string | null | undefined): string {
  return formatDeviceTimestamp(value, {
    prefix: 'First seen',
    fallback: 'First seen unknown',
    includeTime: false,
  })
}

export function formatDeviceLastSeen(value: string | null | undefined): string {
  return formatDeviceTimestamp(value, {
    prefix: 'Last seen',
    fallback: 'Last seen unknown',
    includeTime: true,
  })
}

function formatDeviceTimestamp(
  value: string | null | undefined,
  options: { prefix: string; fallback: string; includeTime: boolean },
): string {
  const date = parseDate(value)
  if (!date) return options.fallback

  return `${options.prefix} ${date.toLocaleString(DATE_LOCALE, {
    dateStyle: 'medium',
    ...(options.includeTime ? { timeStyle: 'short' as const } : {}),
  })}`
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
