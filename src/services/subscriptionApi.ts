import config from '@/config'
import type { SubscriptionPlan } from '@/features/subscription/types'
import { PLANS } from '@/features/subscription/services/subscriptionService'
import { apiClient } from './apiClient'

export interface SubscribePayload {
  planId: string
  /** Payment method token from your payment provider (Stripe, etc.) */
  paymentMethodToken?: string
}

export const subscriptionApi = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    if (config.api.useMock) return PLANS
    return apiClient.get<SubscriptionPlan[]>('/subscription/plans')
  },

  async subscribe(payload: SubscribePayload): Promise<void> {
    if (config.api.useMock) return   // authStore.subscribe() handles mock state
    await apiClient.post('/subscription/subscribe', payload)
  },

  async cancel(): Promise<void> {
    if (config.api.useMock) return
    await apiClient.post('/subscription/cancel')
  },

  async getStatus(): Promise<{ isSubscribed: boolean }> {
    if (config.api.useMock) return { isSubscribed: false }
    return apiClient.get<{ isSubscribed: boolean }>('/subscription/status')
  },
}
