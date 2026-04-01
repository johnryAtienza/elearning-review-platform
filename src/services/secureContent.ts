/**
 * secureContent.ts — browser-safe client for the get-signed-urls Edge Function
 *
 * Calls the Edge Function with the user's JWT and returns short-lived signed
 * GET URLs for the lesson's video and PDF. Both can be null when the lesson
 * has no file stored yet.
 */

import { supabase } from './supabaseClient'
import config from '@/config'

export interface SecureContentResult {
  videoUrl: string | null
  pdfUrl: string | null
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

function getEdgeFunctionUrl(): string {
  return `${config.supabase.url}/functions/v1/get-signed-urls`
}

/**
 * Fetch presigned GET URLs for a lesson's video and PDF.
 * Throws `SecureContentFetchError` for auth / subscription / not-found errors.
 */
export async function getSignedContentUrls(lessonId: string): Promise<SecureContentResult> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new SecureContentFetchError('UNAUTHORIZED', 'Not authenticated')
  }

  const res = await fetch(getEdgeFunctionUrl(), {
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
