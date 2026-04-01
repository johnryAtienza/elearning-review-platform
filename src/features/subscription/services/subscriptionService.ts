import { subscriptionApi } from '@/services/subscriptionApi'
import config from '@/config'
import type { SubscriptionPlan } from '../types'

/**
 * PLANS is kept here as the mock source of truth.
 * subscriptionApi imports it directly when useMock=true.
 */
export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with the basics',
    features: [
      'Browse all courses',
      'View course details',
      'See lesson list (locked)',
      'Community access',
    ],
    missing: ['Access lesson content', 'Interactive quizzes', 'Reviewer notes', 'Progress tracking'],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: config.subscription.proPricePerMonth,
    period: 'per month',
    description: 'Full access to everything',
    features: [
      'Everything in Free',
      'Unlimited lesson access',
      'Interactive quizzes after every lesson',
      'Reviewer notes & summaries',
      'Progress tracking',
      'Priority support',
    ],
    missing: [],
    cta: 'Activate Pro',
    highlight: true,
  },
]

export async function getPlans(): Promise<SubscriptionPlan[]> {
  return subscriptionApi.getPlans()
}
