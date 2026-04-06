/**
 * useSecureContent
 *
 * Fetches presigned R2 GET URLs for a lesson's video and PDF.
 * Fires for all authenticated users — the edge function returns tier-appropriate
 * URLs (free tier: PDF only; standard tier: video + PDF).
 *
 * The hook re-fetches automatically when the lessonId changes.
 * Signed URLs expire after 1 hour — callers can remount the hook to refresh.
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
}

export function useSecureContent(
  lessonId: string,
  isAuthenticated: boolean,
): UseSecureContentResult {
  const [result, setResult] = useState<SecureContentResult>({
    videoUrl: null,
    pdfUrl: null,
    tier: 'free',
  })
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState<SecureContentFetchError | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !lessonId) {
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
  }, [lessonId, isAuthenticated])

  return { ...result, loading, error }
}
