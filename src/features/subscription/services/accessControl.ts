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

// Guest (unauthenticated) — everything is locked. The lesson page renders a
// "sign in to start" CTA instead of the video/PDF/quiz, so these values mostly
// guard against accidental access if a component reads permissions directly.
const GUEST_PERMISSIONS: TierPermissions = {
  videoPreviewSeconds:  0,
  pdfMaxPages:          0,
  quizEnabled:          false,
  downloadEnabled:      false,
  showAnswersAfterQuiz: false,
}

// ── Accessor helpers ───────────────────────────────────────────────────────────

export function getPermissions(tier: SubscriptionTier): TierPermissions {
  return TIER_PERMISSIONS[tier]
}

/**
 * Effective permissions for a specific lesson.
 *
 * Day 1 lessons are free for every *authenticated* user (no 30s video cap, no
 * PDF page limit, no quiz lock) regardless of subscription tier. Day 2+
 * lessons follow the normal tier matrix. Unauthenticated callers get fully
 * locked permissions — signing up is the "enrollment" step that unlocks Day 1.
 *
 * Pass the lesson by reference; only `dayNumber` is read so this works with
 * any object that has the field (Lesson, AdminLesson, etc.).
 */
export function getEffectivePermissions(
  tier: SubscriptionTier,
  lesson: { dayNumber?: number | null } | null | undefined,
  isAuthenticated: boolean = true,
): TierPermissions {
  if (!isAuthenticated) return GUEST_PERMISSIONS
  if (lesson?.dayNumber === 1) return TIER_PERMISSIONS.standard
  return TIER_PERMISSIONS[tier]
}

/**
 * True when the given lesson is the Day 1 free-access lesson AND the user is
 * authenticated. Guests do not get the Day 1 bypass — they must register first.
 */
export function isDayOneFree(
  lesson: { dayNumber?: number | null } | null | undefined,
  isAuthenticated: boolean = true,
): boolean {
  return isAuthenticated && lesson?.dayNumber === 1
}

/**
 * Effective tier for a specific lesson. Day 1 unlocks standard-tier access
 * for any authenticated user. Useful for components (e.g. ReviewerSection)
 * that derive their own permissions from a tier prop.
 */
export function getEffectiveTier(
  tier: SubscriptionTier,
  lesson: { dayNumber?: number | null } | null | undefined,
  isAuthenticated: boolean = true,
): SubscriptionTier {
  if (!isAuthenticated) return 'free'
  return lesson?.dayNumber === 1 ? 'standard' : tier
}

/** Derive tier from subscription status. Extend here if more tiers are added. */
export function tierFromSubscribed(isSubscribed: boolean): SubscriptionTier {
  return isSubscribed ? 'standard' : 'free'
}

export function isUnlimited(value: number): boolean {
  return value >= Number.MAX_SAFE_INTEGER
}
