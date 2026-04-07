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
  /** How many months were added */
  daysAdded: number
  /** ISO string — what expires_at was before this call (null = first subscription) */
  previousExpiresAt: string | null
}

// ── API ───────────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  /**
   * Create or extend the Standard subscription.
   *
   * Carryover: if the user already has an active subscription the server adds
   * `durationMonths` to the existing expiry date — no days are lost.
   */
  async subscribe(durationMonths: SubscriptionDuration): Promise<SubscribeResponse> {
    if (config.api.useMock) {
      // Mock: pretend the subscription was created right now
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)
      return { expiresAt: expiresAt.toISOString(), daysAdded: durationMonths * 30, previousExpiresAt: null }
    }

    // Require a real Supabase session — mock sessions have no JWT.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to subscribe.')

    // supabase.functions.invoke() automatically attaches the user JWT
    // and the required apikey header — no manual header management needed.
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
