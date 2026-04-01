/**
 * useSecureContent
 *
 * Fetches presigned R2 GET URLs for a lesson's video and PDF.
 * Only fires when the user is subscribed; returns nulls immediately otherwise.
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

export interface UseSecureContentResult {
  videoUrl: string | null
  pdfUrl: string | null
  loading: boolean
  /** Set when the request fails — includes subscription-required errors */
  error: SecureContentFetchError | null
}

export function useSecureContent(
  lessonId: string,
  isSubscribed: boolean,
): UseSecureContentResult {
  const [result, setResult] = useState<SecureContentResult>({ videoUrl: null, pdfUrl: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<SecureContentFetchError | null>(null)

  useEffect(() => {
    if (!isSubscribed || !lessonId) {
      setResult({ videoUrl: null, pdfUrl: null })
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
  }, [lessonId, isSubscribed])

  return { ...result, loading, error }
}
