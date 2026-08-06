/**
 * useSecureContent
 *
 * Fetches signed legacy video/PDF URLs via the get-signed-urls Edge Function.
 * Callers control when the fetch fires via
 * `canFetch` — typically `isAuthenticated || isFreePreview(lesson)`.
 *
 *   • Subscribed users   → signed URLs for every lesson.
 *   • Free / guest users → signed URLs only for `is_free_preview` lessons.
 *
 * The Edge Function is the authoritative gate; the hook just relays.
 *
 * The hook re-fetches automatically when `lessonId` or `canFetch` change.
 * Signed URLs expire after 60s — callers can remount the hook to refresh.
 */

import { useState, useEffect } from 'react'
import {
  getSignedContentUrls,
  SecureContentFetchError,
  type SecureContentResult,
} from '@/services/secureContent'
import type { SubscriptionTier } from '@/features/subscription/types'

export interface UseSecureContentResult {
  videoUrl: string | null
  pdfUrl: string | null
  /** Tier confirmed by the server — drives client-side restrictions */
  tier: SubscriptionTier
  loading: boolean
  error: SecureContentFetchError | null
  retry: () => void
}

export function useSecureContent(
  lessonId: string,
  canFetch: boolean,
): UseSecureContentResult {
  const [result, setResult] = useState<SecureContentResult>({
    videoUrl: null,
    pdfUrl: null,
    tier: 'free',
  })
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState<SecureContentFetchError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!canFetch || !lessonId) {
      // Clear a prior authorized session immediately when entitlement is lost
      // or the lesson changes; retaining it would be a content leak.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult({ videoUrl: null, pdfUrl: null, tier: 'free' })
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getSignedContentUrls(lessonId)
      .then((data) => {
        if (!cancelled) {
          setResult(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        if (err instanceof SecureContentFetchError) {
          setError(err)
        } else {
          setError(
            new SecureContentFetchError('SERVER_ERROR', 'Unexpected error fetching content'),
          )
        }
      })

    return () => { cancelled = true }
  }, [lessonId, canFetch, retryCount])

  return { ...result, loading, error, retry: () => setRetryCount((count) => count + 1) }
}
