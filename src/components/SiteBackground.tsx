import { useEffect, useRef } from 'react'

/**
 * Decorative full-viewport background: faint engineering-blueprint grid with
 * overlaid concentric rings and corner registration marks. The grid + rings
 * drift opposite the cursor (max ±12px). Pointer-events disabled, aria-hidden,
 * skipped entirely on touch devices and when prefers-reduced-motion is set.
 */
export function SiteBackground() {
  const parallaxRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(hover: none)').matches
    if (reducedMotion || touch) return

    let raf = 0
    let targetX = 0
    let targetY = 0
    const MAX = 12

    const apply = () => {
      raf = 0
      const node = parallaxRef.current
      if (node) {
        node.style.transform = `translate3d(${-targetX}px, ${-targetY}px, 0)`
      }
    }

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * MAX * 2
      targetY = (e.clientY / window.innerHeight - 0.5) * MAX * 2
      if (!raf) raf = requestAnimationFrame(apply)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden text-foreground"
    >
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sb-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <g ref={parallaxRef} style={{ willChange: 'transform' }}>
          <rect width="100%" height="100%" fill="url(#sb-grid)" />
          <g fill="none" strokeWidth="1">
            <circle cx="20%" cy="22%" r="140" stroke="currentColor" strokeOpacity="0.06" />
            <circle cx="35%" cy="22%" r="140" stroke="currentColor" strokeOpacity="0.06" />
            <circle cx="50%" cy="22%" r="140" stroke="var(--brand)" strokeOpacity="0.12" />
            <circle cx="65%" cy="22%" r="140" stroke="currentColor" strokeOpacity="0.06" />
            <circle cx="80%" cy="22%" r="140" stroke="currentColor" strokeOpacity="0.06" />
          </g>
        </g>
      </svg>

      {/* Corner registration marks — fixed to viewport corners, no parallax */}
      {[
        'top-6 left-6',
        'top-6 right-6',
        'bottom-6 left-6',
        'bottom-6 right-6',
      ].map((pos) => (
        <div key={pos} className={`absolute ${pos} size-3`}>
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/20" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/20" />
        </div>
      ))}
    </div>
  )
}
