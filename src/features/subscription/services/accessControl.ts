/**
 * accessControl.ts
 *
 * Single source of truth for what each subscription tier is allowed to do.
 * All feature gates in the app should read from this module — never hardcode
 * tier logic in components or pages.
 *
 * Limits are configurable via environment variables (see config.ts).
 */

import config from '@/config'
import type { SubscriptionTier, TierPermissions } from '../types'

// ── Tier permission matrix ─────────────────────────────────────────────────────

export const TIER_PERMISSIONS: Record<SubscriptionTier, TierPermissions> = {
  free: {
    videoPreviewSeconds:  config.limits.freeVideoPreviewSeconds,
    pdfMaxPages:          config.limits.freePdfMaxPages,
    quizEnabled:          false,
    downloadEnabled:      false,
    showAnswersAfterQuiz: false,
  },
  standard: {
    videoPreviewSeconds:  Number.MAX_SAFE_INTEGER, // effectively unlimited
    pdfMaxPages:          Number.MAX_SAFE_INTEGER, // effectively unlimited
    quizEnabled:          true,
    downloadEnabled:      false,                   // no download for any tier
    showAnswersAfterQuiz: true,
  },
}

// ── Accessor helpers ───────────────────────────────────────────────────────────

export function getPermissions(tier: SubscriptionTier): TierPermissions {
  return TIER_PERMISSIONS[tier]
}

/** Derive tier from subscription status. Extend here if more tiers are added. */
export function tierFromSubscribed(isSubscribed: boolean): SubscriptionTier {
  return isSubscribed ? 'standard' : 'free'
}

export function isUnlimited(value: number): boolean {
  return value >= Number.MAX_SAFE_INTEGER
}
