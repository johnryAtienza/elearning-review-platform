export type SubscriptionTier = 'free' | 'standard'

/** Valid subscription durations in months */
export type SubscriptionDuration = 1 | 3 | 6

export interface TierPermissions {
  /** Max seconds of video playable. Number.MAX_SAFE_INTEGER = no limit. */
  videoPreviewSeconds: number
  /** Max PDF pages viewable. Number.MAX_SAFE_INTEGER = no limit. */
  pdfMaxPages: number
  /** Whether the quiz section is accessible */
  quizEnabled: boolean
  /** File download — disabled for all tiers per policy */
  downloadEnabled: boolean
  /** Show correct answers in result summary after quiz submission */
  showAnswersAfterQuiz: boolean
}

/**
 * A purchasable duration option for the Standard plan.
 * All prices are computed from config — never hardcoded here.
 */
export interface DurationOption {
  months: SubscriptionDuration
  label: string          // '1 Month' | '3 Months' | '6 Months'
  priceTotal: number     // total amount charged (PHP)
  pricePerMonth: number  // effective per-month rate (PHP)
  discountPercent: number // 0 | 10 | 20
  badge?: string         // optional callout e.g. 'Best Value'
}

/**
 * Snapshot of the current user's active subscription.
 * Populated by authStore.syncSubscription() from Supabase.
 */
export interface ActiveSubscription {
  tier: SubscriptionTier
  durationMonths: number
  /** ISO date string — null means the subscription never expires */
  expiresAt: string | null
  /** Whole days until expiry — null when expiresAt is null (lifetime) */
  daysRemaining: number | null
  isExpired: boolean
}

/** Legacy shape — used by the plan card UI */
export interface SubscriptionPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  missing: string[]
  cta: string
  highlight: boolean
}
