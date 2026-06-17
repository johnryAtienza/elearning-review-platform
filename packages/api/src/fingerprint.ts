/**
 * Stable browser-install identity + UA-based mobile/desktop classifier.
 *
 * The primary fingerprint is a locally persisted random ID. FingerprintJS is
 * retained only as a migration alias for rows created before the stable ID
 * rollout.
 *
 * Caveats:
 *  - Clearing site data, using private/incognito mode, or switching browser
 *    profiles intentionally creates a new browser-install ID.
 *  - Mobile/desktop is classified from `navigator.userAgent` only. Edge
 *    cases (iPad in desktop-mode, etc.) are acceptable; admins can correct
 *    via the DB if needed.
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs'
import type { DeviceKind } from '@s-class/types/devices'

const INSTALL_ID_KEY = 's-class:device-install-id:v1'

// Module-level promise so the FP agent loads once per page load.
let agentPromise: ReturnType<typeof FingerprintJS.load> | null = null

function getAgent() {
  if (!agentPromise) agentPromise = FingerprintJS.load()
  return agentPromise
}

export interface DeviceIdentity {
  fingerprint:         string
  fingerprintAliases:  string[]
  deviceKind:          DeviceKind
  userAgent:           string
}

/**
 * Compute the current device's identity.
 * FingerprintJS failures do not block registration; the stable browser-install
 * ID is the authoritative device key.
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  const fingerprint = getOrCreateInstallId()
  const ua          = navigator.userAgent ?? ''
  const aliases     = await getLegacyFingerprintAliases(fingerprint)

  return {
    fingerprint,
    fingerprintAliases: aliases,
    deviceKind: classifyKind(ua),
    userAgent: ua,
  }
}

async function getLegacyFingerprintAliases(primaryFingerprint: string): Promise<string[]> {
  try {
    const agent  = await getAgent()
    const result = await agent.get()
    const legacy = result.visitorId?.trim()
    return legacy && legacy !== primaryFingerprint ? [legacy] : []
  } catch (err) {
    console.warn('[fingerprint] FingerprintJS alias unavailable:', err)
    return []
  }
}

function getOrCreateInstallId(): string {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY)?.trim()
    if (existing) return existing

    const next = createInstallId()
    localStorage.setItem(INSTALL_ID_KEY, next)
    return next
  } catch {
    return createInstallId()
  }
}

function createInstallId(): string {
  if (crypto.randomUUID) return `browser-${crypto.randomUUID()}`

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `browser-${hex}`
}

/**
 * Classify a User-Agent string as 'mobile' or 'desktop'.
 *
 * Simple regex check against common mobile markers. Anything that isn't
 * obviously mobile is treated as desktop. iPad in desktop-mode is
 * intentionally classified as desktop (matches the iPad's own self-report).
 */
export function classifyKind(userAgent: string): DeviceKind {
  if (!userAgent) return 'desktop'
  return /android|iphone|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)
    ? 'mobile'
    : 'desktop'
}
