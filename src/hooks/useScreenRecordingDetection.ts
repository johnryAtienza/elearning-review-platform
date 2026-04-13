import { useEffect, useRef } from 'react'

/**
 * Heuristic detection of possible screen capture activity.
 *
 * Strategy: rapid window blur → focus cycles (< 400 ms) are a common
 * side-effect of screen-recorder tools switching focus. Three such cycles
 * in a session trigger the `onSuspicious` callback.
 *
 * This is best-effort only — false positives are possible during normal use.
 * Use it for logging/analytics, not for blocking access.
 *
 * @param enabled      - Pass false to disable (admin users, dev mode, etc.)
 * @param onSuspicious - Called when suspicious activity is detected.
 *                       Receives a running count of detections this session.
 */
export function useScreenRecordingDetection(
  enabled: boolean,
  onSuspicious?: (count: number) => void,
) {
  const blurAtRef       = useRef<number | null>(null)
  const rapidCountRef   = useRef(0)
  const totalCountRef   = useRef(0)
  // Suppress repeated callbacks within a short window
  const cooldownRef     = useRef(false)

  useEffect(() => {
    if (!enabled) return

    function onBlur() {
      blurAtRef.current = Date.now()
    }

    function onFocus() {
      const blurAt = blurAtRef.current
      blurAtRef.current = null
      if (blurAt === null) return

      const elapsed = Date.now() - blurAt

      if (elapsed < 400) {
        rapidCountRef.current += 1

        if (rapidCountRef.current >= 3 && !cooldownRef.current) {
          totalCountRef.current += 1
          rapidCountRef.current  = 0
          cooldownRef.current    = true

          // Quiet cooldown — reset after 10 s to avoid log spam
          setTimeout(() => { cooldownRef.current = false }, 10_000)

          if (import.meta.env.DEV) {
            console.warn(
              `[ContentProtection] Possible screen capture detected (event #${totalCountRef.current}).`,
            )
          }

          onSuspicious?.(totalCountRef.current)
        }
      } else {
        // Normal focus return — reset rapid counter
        rapidCountRef.current = 0
      }
    }

    window.addEventListener('blur',  onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur',  onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, onSuspicious])
}
