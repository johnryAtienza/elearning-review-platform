/**
 * accessControl.ts
 *
 * Single source of truth for what each subscription tier is allowed to do.
 * All feature gates in the app should read from this module — never hardcode
 * tier logic in components or pages.
 *
 * Limits are configurable via environment variables (see config.ts).
 */

import config from '@s-class/config'
import type { SubscriptionTier, TierPermissions } from '@s-class/types/subscription'

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

// Guest (unauthenticated) — everything is locked. Reading a non-preview lesson
// renders a "sign in to start" CTA instead of the video/PDF/quiz; these values
// guard against accidental access if a component reads permissions directly.
const GUEST_PERMISSIONS: TierPermissions = {
  videoPreviewSeconds:  0,
  pdfMaxPages:          0,
  quizEnabled:          false,
  downloadEnabled:      false,
  showAnswersAfterQuiz: false,
}

// Any object with the preview flag — works with Lesson, AdminLesson, mock data,
// etc. Only the fields we read are required.
type PreviewableLesson = {
  dayNumber?: number | null
  isFreePreview?: boolean | null
}

// ── Accessor helpers ───────────────────────────────────────────────────────────

export function getPermissions(tier: SubscriptionTier): TierPermissions {
  return TIER_PERMISSIONS[tier]
}

/**
 * True when the lesson is flagged as a free preview on the server. Preview
 * lessons are accessible to guests and authenticated free-tier users alike,
 * and play in full (no 30s cap, no PDF page limit, quiz enabled).
 *
 * Server-side authoritative — `lessons.is_free_preview`. Replaces the legacy
 * "dayNumber === 1" rule; backfilled to TRUE on all existing Day-1 lessons by
 * migration 20260605000001.
 */
export function isFreePreview(lesson: PreviewableLesson | null | undefined): boolean {
  return lesson?.isFreePreview === true
}

/**
 * Effective permissions for a specific lesson.
 *
 * Free-preview lessons grant standard-tier limits to every caller (guests
 * included) so the video plays in full. Everything else falls back to the
 * caller's tier, and unauthenticated callers on non-preview lessons get
 * fully locked permissions.
 */
export function getEffectivePermissions(
  tier: SubscriptionTier,
  lesson: PreviewableLesson | null | undefined,
  isAuthenticated: boolean = true,
): TierPermissions {
  if (isFreePreview(lesson)) return TIER_PERMISSIONS.standard
  if (!isAuthenticated)      return GUEST_PERMISSIONS
  return TIER_PERMISSIONS[tier]
}

/**
 * @deprecated Use `isFreePreview(lesson)`. Kept as a thin alias for the
 * pre-migration call sites that asked "is this the Day-1 free lesson?".
 * Backfill (migration 20260605000001) makes the two predicates equivalent
 * for legacy data; new lessons rely on the explicit flag.
 */
export function isDayOneFree(
  lesson: PreviewableLesson | null | undefined,
  _isAuthenticated: boolean = true,
): boolean {
  return isFreePreview(lesson)
}

/**
 * Effective tier for a specific lesson. Free-preview lessons grant standard-tier
 * access regardless of subscription. Useful for components (e.g. ReviewerSection)
 * that derive their own behavior from a tier prop.
 */
export function getEffectiveTier(
  tier: SubscriptionTier,
  lesson: PreviewableLesson | null | undefined,
  isAuthenticated: boolean = true,
): SubscriptionTier {
  if (isFreePreview(lesson)) return 'standard'
  if (!isAuthenticated)      return 'free'
  return tier
}

/** Derive tier from subscription status. Extend here if more tiers are added. */
export function tierFromSubscribed(isSubscribed: boolean): SubscriptionTier {
  return isSubscribed ? 'standard' : 'free'
}

export function isUnlimited(value: number): boolean {
  return value >= Number.MAX_SAFE_INTEGER
}
