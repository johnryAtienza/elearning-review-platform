import { subscriptionApi } from '@/services/subscriptionApi'
import config from '@/config'
import type { SubscriptionPlan } from '../types'

/**
 * PLANS is the mock source of truth for subscription tiers.
 * subscriptionApi imports it directly when useMock=true.
 */
export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Explore the platform at no cost',
    features: [
      'Browse all courses',
      'View course details & lesson list',
      '30-second video preview per lesson',
      'First 5 pages of reviewer PDFs',
      'Community access',
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
    price: config.subscription.standardPricePerMonth,
    period: 'per month',
    description: 'Full access to everything',
    features: [
      'Everything in Free',
      'Full video access (download disabled)',
      'Complete reviewer PDFs (download disabled)',
      'Interactive quizzes after every lesson',
      'Immediate score + correct answers',
      'Progress tracking',
      'Priority support',
    ],
    missing: [],
    cta: 'Upgrade to Standard',
    highlight: true,
  },
]

export async function getPlans(): Promise<SubscriptionPlan[]> {
  return subscriptionApi.getPlans()
}
