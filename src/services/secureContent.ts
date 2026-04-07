/**
 * secureContent.ts — browser-safe client for the get-signed-urls Edge Function
 *
 * Calls the Edge Function with the user's JWT and returns short-lived signed
 * GET URLs for the lesson's video and PDF. The edge function determines the
 * user's subscription tier and returns URLs accordingly:
 *   - free tier:     pdfUrl only (page limit enforced on frontend)
 *   - standard tier: videoUrl + pdfUrl (full access)
 */

import { supabase } from './supabaseClient'
import type { SubscriptionTier } from '@/features/subscription/types'

export interface SecureContentResult {
  videoUrl: string | null
  pdfUrl: string | null
  /** Tier returned by the server — use this for client-side restrictions */
  tier: SubscriptionTier
}

export type SecureContentError =
  | 'UNAUTHORIZED'
  | 'NO_SUBSCRIPTION'
  | 'LESSON_NOT_FOUND'
  | 'SERVER_ERROR'

export class SecureContentFetchError extends Error {
  readonly code: SecureContentError

  constructor(code: SecureContentError, message: string) {
    super(message)
    this.name = 'SecureContentFetchError'
    this.code = code
  }

  get isSubscriptionRequired(): boolean {
    return this.code === 'NO_SUBSCRIPTION'
  }
}

/**
 * Fetch presigned GET URLs for a lesson's video and PDF.
 * Available to all authenticated users — tier determines which URLs are returned.
 * Throws `SecureContentFetchError` for auth / not-found errors.
 */
export async function getSignedContentUrls(lessonId: string): Promise<SecureContentResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new SecureContentFetchError('UNAUTHORIZED', 'Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/get-signed-urls`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ lessonId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    const message = body.error ?? `Request failed (${res.status})`
    if (res.status === 401) throw new SecureContentFetchError('UNAUTHORIZED', message)
    if (res.status === 403) throw new SecureContentFetchError('NO_SUBSCRIPTION', message)
    if (res.status === 404) throw new SecureContentFetchError('LESSON_NOT_FOUND', message)
    throw new SecureContentFetchError('SERVER_ERROR', message)
  }

  return res.json() as Promise<SecureContentResult>
}
