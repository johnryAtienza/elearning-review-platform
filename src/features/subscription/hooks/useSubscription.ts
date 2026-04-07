import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { subscriptionApi } from '@/services/subscriptionApi'
import { DURATION_OPTIONS, PLANS } from '../services/subscriptionService'
import type { SubscriptionDuration } from '../types'

export function useSubscription() {
  const { isSubscribed, subscription, syncSubscription } = useAuthStore()
  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDuration>(1)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Create or extend the Standard subscription for the selected duration. */
  async function subscribe(): Promise<void> {
    setError(null)
    setSubscribing(true)
    try {
      await subscriptionApi.subscribe(selectedDuration)
      // Re-sync so the store reflects the new expiry immediately
      await syncSubscription()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return {
    /** Whether the user currently has an active Standard subscription */
    isSubscribed,
    /** Full subscription snapshot (tier, expiresAt, daysRemaining, …) */
    subscription,
    /** All purchasable duration options with computed prices */
    durationOptions: DURATION_OPTIONS,
    /** Currently selected duration (controls price shown on the page) */
    selectedDuration,
    setSelectedDuration,
    /** Call to purchase / extend the subscription at selectedDuration */
    subscribe,
    subscribing,
    error,
    /** Legacy plan cards for the plan comparison section */
    plans: PLANS,
  }
}
