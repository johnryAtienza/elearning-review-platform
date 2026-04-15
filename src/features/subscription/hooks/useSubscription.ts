import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { subscriptionApi } from '@/services/subscriptionApi'
import { DURATION_OPTIONS, PLANS } from '../services/subscriptionService'
import type { SubscriptionDuration } from '../types'

export function useSubscription() {
  const { isSubscribed, subscription, syncSubscription } = useAuthStore()
  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDuration>(1)
  const [checking,  setChecking]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  /**
   * Create a PayMongo Checkout Session and redirect the user to PayMongo's
   * payment page. After payment, PayMongo redirects to /payment-success.
   * The browser navigates away — no further state updates happen here.
   */
  async function checkout(): Promise<void> {
    setError(null)
    setChecking(true)
    try {
      const { checkoutUrl } = await subscriptionApi.createCheckout(selectedDuration)
      // Full page redirect to PayMongo — React state is irrelevant after this
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
      setChecking(false) // only reset if redirect didn't happen
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
    /** Call to begin checkout for selectedDuration — redirects to PayMongo */
    checkout,
    /** True while the checkout session is being created */
    checking,
    error,
    /** Legacy plan cards for the plan comparison section */
    plans: PLANS,
    /** Direct subscription without payment — used internally / admin mode */
    syncSubscription,
  }
}
