/**
 * Fingerprint wrapper + UA-based mobile/desktop classifier.
 *
 * Wraps FingerprintJS (the free OSS build) so the rest of the app calls a
 * simple `getDeviceIdentity()` helper.
 *
 * Caveats:
 *  - The free FingerprintJS build returns a probabilistic visitorId. Major
 *    browser updates or OS changes can shift the value, causing what looks
 *    like the same device to be rejected by the Phase G hard cap. Mitigation:
 *    the "Sign out other devices" UI is always available.
 *  - Mobile/desktop is classified from `navigator.userAgent` only. Edge
 *    cases (iPad in desktop-mode, etc.) are acceptable; admins can correct
 *    via the DB if needed.
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs'
import type { DeviceKind } from '@s-class/types/devices'

// Module-level promise so the FP agent loads once per page load.
let agentPromise: ReturnType<typeof FingerprintJS.load> | null = null

function getAgent() {
  if (!agentPromise) agentPromise = FingerprintJS.load()
  return agentPromise
}

export interface DeviceIdentity {
  fingerprint: string
  deviceKind:  DeviceKind
  userAgent:   string
}

/**
 * Compute the current device's identity.
 * Throws if FingerprintJS fails — caller should treat the throw as a
 * non-blocking soft-fail (skip registration rather than block login).
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  const agent  = await getAgent()
  const result = await agent.get()
  const ua     = navigator.userAgent ?? ''
  return {
    fingerprint: result.visitorId,
    deviceKind:  classifyKind(ua),
    userAgent:   ua,
  }
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
