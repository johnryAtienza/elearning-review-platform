/**
 * PdfViewer
 *
 * Embeds a PDF in an iframe with optional page-count restriction for free tier.
 *
 * Free tier  — constrained height ≈ maxPages × ~900 px, with a gradient
 *              overlay + upgrade CTA covering the bottom.
 * Standard   — full-height scrollable iframe (no overlay).
 *
 * Download is disabled for all tiers:
 *   • controlsList="nodownload" on the iframe where supported
 *   • "Open in new tab" link is intentionally omitted
 *   • Right-click context menu suppressed
 *
 * NOTE: The height-based clipping is a UX-layer restriction. True enforcement
 * requires the backend to serve a page-trimmed PDF for free users.
 */

import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

interface PdfViewerProps {
  src: string
  title?: string
  /**
   * Max pages to display. When provided the viewer clips at approx. this many
   * pages and shows an upgrade gradient overlay.
   * Pass `undefined` (or omit) for unlimited (standard tier).
   */
  maxPages?: number
}

/** Approximate rendered height of one PDF page at 100% zoom in a browser iframe */
const PAGE_HEIGHT_PX = 900
/** Full-height for unlimited viewing */
const FULL_HEIGHT_PX = 700

export function PdfViewer({ src, title = 'Study Guide (PDF)', maxPages }: PdfViewerProps) {
  const isLimited      = typeof maxPages === 'number'
  const containerH     = isLimited ? maxPages * PAGE_HEIGHT_PX : FULL_HEIGHT_PX
  // Give the iframe a little extra so it doesn't show a hard cut before the overlay
  const iframeH        = isLimited ? containerH + 300 : FULL_HEIGHT_PX

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm">
      {/* ── Header bar ── */}
      <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1 truncate">
          {title}
        </p>
        {isLimited && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-0.5 shrink-0">
            Preview · {maxPages} page{maxPages !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── PDF area ── */}
      <div
        className="relative overflow-hidden bg-white"
        style={{ height: `${containerH}px` }}
      >
        <iframe
          src={src}
          title={title}
          className="w-full border-0 bg-white"
          style={{ height: `${iframeH}px` }}
          // Suppress right-click / save-as inside the iframe
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Page-limit gradient + upgrade CTA */}
        {isLimited && (
          <div className="absolute bottom-0 inset-x-0 h-72 pointer-events-none">
            {/* Fade-out gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />

            {/* Upgrade card — re-enable pointer events just for the CTA */}
            <div className="absolute bottom-0 inset-x-0 pb-8 flex flex-col items-center gap-3 text-center px-4 pointer-events-auto">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Lock className="size-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  Viewing first {maxPages} page{maxPages !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to Standard for the complete study guide.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Standard</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
