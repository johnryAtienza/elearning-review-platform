/**
 * subscriptionApi.ts
 *
 * Client for subscription-related Supabase Edge Functions.
 * All calls are authenticated with the current user's JWT.
 */

import config from '@/config'
import { supabase } from './supabaseClient'
import type { SubscriptionDuration } from '@/features/subscription/types'

// ── Response shapes ───────────────────────────────────────────────────────────

export interface SubscribeResponse {
  /** ISO string — new expiry after subscribing / extending */
  expiresAt: string
  /** How many days were added */
  daysAdded: number
  /** ISO string — what expires_at was before this call (null = first subscription) */
  previousExpiresAt: string | null
}

export interface CheckoutResponse {
  /** PayMongo Checkout URL — redirect the user here */
  checkoutUrl: string
  /** PayMongo checkout session ID */
  sessionId: string
}

export interface VerifyPaymentResponse {
  /** Subscription tier activated */
  tier: string
  /** New expiry date as ISO string */
  expiresAt: string | null
  /** Days added to the subscription */
  daysAdded: number
  /** True if this session was already processed (idempotent repeat call) */
  alreadyProcessed: boolean
}

// ── API ───────────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  /**
   * Create a PayMongo Checkout Session for the given duration.
   * Returns a checkout URL — redirect the user to it to complete payment.
   * After payment, PayMongo redirects to successUrl with ?session_id=xxx.
   */
  async createCheckout(durationMonths: SubscriptionDuration): Promise<CheckoutResponse> {
    if (config.api.useMock) {
      // In mock mode, skip PayMongo and pretend the checkout happened.
      // Encode a fake session ID so the success page has something to work with.
      return {
        checkoutUrl: `${window.location.origin}/payment-success?session_id=mock_session`,
        sessionId:   'mock_session',
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to subscribe.')

    const successUrl = `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl  = `${window.location.origin}/payment-cancel`

    const { data, error } = await supabase.functions.invoke<CheckoutResponse>('create-checkout', {
      body: { durationMonths, successUrl, cancelUrl },
    })

    if (error) throw new Error(error.message ?? 'Failed to create checkout session.')
    if (!data) throw new Error('Empty response from checkout service.')
    return data
  },

  /**
   * Verify a PayMongo Checkout Session after the user returns from payment.
   * Activates the subscription if payment is confirmed.
   * Idempotent — safe to call multiple times for the same sessionId.
   */
  async verifyPayment(sessionId: string): Promise<VerifyPaymentResponse> {
    if (config.api.useMock || sessionId === 'mock_session') {
      // Mock: pretend subscription was verified successfully
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)
      return {
        tier:             'standard',
        expiresAt:        expiresAt.toISOString(),
        daysAdded:        30,
        alreadyProcessed: false,
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to verify your payment.')

    const { data, error } = await supabase.functions.invoke<VerifyPaymentResponse>('verify-payment', {
      body: { sessionId },
    })

    if (error) throw new Error(error.message ?? 'Payment verification failed.')
    if (!data) throw new Error('Empty response from verification service.')
    return data
  },

  /**
   * Create or extend the Standard subscription directly (no payment).
   * Only callable by admins or in development/mock mode.
   * In production, subscriptions are activated via verify-payment or the webhook.
   */
  async subscribe(durationMonths: SubscriptionDuration): Promise<SubscribeResponse> {
    if (config.api.useMock) {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)
      return { expiresAt: expiresAt.toISOString(), daysAdded: durationMonths * 30, previousExpiresAt: null }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to subscribe.')

    const { data, error } = await supabase.functions.invoke<SubscribeResponse>('subscribe', {
      body: { durationMonths },
    })

    if (error) throw new Error(error.message ?? 'Subscribe failed')
    if (!data) throw new Error('Subscribe failed: empty response')
    return data
  },

  /** Fetch subscription status directly from the subscriptions table. */
  async getStatus(): Promise<{ isSubscribed: boolean; expiresAt: string | null }> {
    if (config.api.useMock) return { isSubscribed: false, expiresAt: null }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { isSubscribed: false, expiresAt: null }

    const now = new Date().toISOString()
    const { data } = await supabase
      .from('subscriptions')
      .select('is_active, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()

    return {
      isSubscribed: !!data,
      expiresAt: data?.expires_at ?? null,
    }
  },
}
