import config from '@/config'
import type { DurationOption, SubscriptionDuration, SubscriptionPlan } from '../types'

// ── Duration plan builder ─────────────────────────────────────────────────────

const { basePricePerMonth, currency, discounts } = config.subscription

/**
 * Compute the three purchasable duration options from config.
 * All prices are derived — change VITE_SUBSCRIPTION_BASE_PRICE to reprice everything.
 *
 * Carryover logic (enforced server-side):
 *   If the user has an active subscription the new months are added to the
 *   existing expiry date, not to today — so no days are lost.
 */
function buildDurationOptions(): DurationOption[] {
  const round = (n: number) => Math.round(n)

  const opts: Array<{ months: SubscriptionDuration; discount: number; badge?: string }> = [
    { months: 1, discount: 0 },
    { months: 3, discount: discounts.months3, badge: 'Popular' },
    { months: 6, discount: discounts.months6, badge: 'Best Value' },
  ]

  return opts.map(({ months, discount, badge }) => {
    const pricePerMonth = round(basePricePerMonth * (1 - discount))
    const priceTotal    = round(pricePerMonth * months)
    const label         = months === 1 ? '1 Month' : `${months} Months`

    return {
      months,
      label,
      pricePerMonth,
      priceTotal,
      discountPercent: Math.round(discount * 100),
      badge,
    }
  })
}

export const DURATION_OPTIONS: DurationOption[] = buildDurationOptions()

/** Format a price value with the configured currency symbol */
export function formatPrice(amount: number): string {
  return `${currency}${amount.toLocaleString()}`
}

// ── Legacy plan cards (used by SubscriptionPage card UI) ─────────────────────

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: `${currency}0`,
    period: 'forever',
    description: 'Explore the platform at no cost',
    features: [
      'Browse all courses',
      'View course details & lesson list',
      '30-second video preview per lesson',
      'First 5 pages of reviewer PDFs',
    ],
    missing: [
      'Full video access',
      'Complete reviewer PDFs',
      'Interactive quizzes & scores',
      'Progress tracking',
    ],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: formatPrice(basePricePerMonth),
    period: 'per month',
    description: 'Full access to everything',
    features: [
      'Everything in Free',
      'Full video access (no download)',
      'Complete reviewer PDFs (no download)',
      'Interactive quizzes after every lesson',
      'Immediate score + correct answers',
      'Progress tracking',
    ],
    missing: [],
    cta: 'Upgrade to Standard',
    highlight: true,
  },
]
