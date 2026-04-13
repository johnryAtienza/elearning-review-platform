import { useEffect, useState } from 'react'

interface ContentWatermarkProps {
  /** Text to display — typically user email or partial user ID */
  label: string
  enabled: boolean
}

interface Position {
  top: string
  left: string
}

/** Returns a random position within a safe inner area (avoids edges) */
function randomPosition(): Position {
  return {
    top:  `${15 + Math.random() * 60}%`,
    left: `${10 + Math.random() * 70}%`,
  }
}

/**
 * Semi-transparent watermark overlay.
 *
 * Designed to sit inside a `position: relative` container covering the
 * protected content (e.g. the video wrapper). The watermark drifts to a
 * new random position every 30 seconds to make cropping-out harder.
 *
 * Intentionally subtle — visible in recordings but not disruptive to
 * normal viewing.
 */
export function ContentWatermark({ label, enabled }: ContentWatermarkProps) {
  const [position, setPosition] = useState<Position>(randomPosition)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setPosition(randomPosition()), 30_000)
    return () => clearInterval(id)
  }, [enabled])

  if (!enabled || !label) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
    >
      <span
        className="absolute text-[11px] font-mono text-white/20 whitespace-nowrap transition-all duration-[2000ms] ease-in-out"
        style={{
          top:       position.top,
          left:      position.left,
          transform: 'translate(-50%, -50%) rotate(-15deg)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
