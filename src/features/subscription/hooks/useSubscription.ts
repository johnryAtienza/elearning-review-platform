import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getPlans } from '../services/subscriptionService'
import type { SubscriptionPlan } from '../types'

export function useSubscription() {
  const { isSubscribed, subscribe } = useAuthStore()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .finally(() => setLoading(false))
  }, [])

  return { isSubscribed, subscribe, plans, loading }
}
