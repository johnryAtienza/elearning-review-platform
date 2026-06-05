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
import type { SubscriptionTier } from '@s-class/types/subscription'

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
 *
 * The Edge Function is the authoritative access gate:
 *   • Guests          → 200 only for `is_free_preview` lessons (401 otherwise).
 *   • Authenticated   → 200 for preview lessons; subscribers also get premium.
 *
 * When the user has no session we still call the function with the project
 * anon key as the Bearer token. The Edge Function reads `auth.getUser(token)`
 * — the anon key returns no user, so it treats the call as a guest.
 *
 * Throws `SecureContentFetchError` for auth / not-found errors.
 */
export async function getSignedContentUrls(lessonId: string): Promise<SecureContentResult> {
  const { data: { session } } = await supabase.auth.getSession()
  const anonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const bearer   = session?.access_token ?? anonKey

  const url = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/get-signed-urls`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
      apikey:        anonKey,
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
