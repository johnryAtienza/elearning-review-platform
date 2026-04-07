/**
 * PdfViewer
 *
 * Renders a PDF using react-pdf (pdf.js). Pages are rendered individually
 * by our code — there is NO browser PDF toolbar — so page-count restriction
 * for the free tier is truly enforced: locked pages are never fetched or drawn.
 *
 * Free tier  — navigable from page 1 to `maxPages` only; an upgrade CTA is
 *              shown when the user reaches the last allowed page.
 * Standard   — all pages, custom prev/next navigation + fullscreen mode.
 *
 * Download is disabled for all tiers (no toolbar, context menu suppressed).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Lock, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

// Use the bundled worker via CDN (simplest Vite setup)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  src: string
  title?: string
  /**
   * Max pages to display. When provided only pages 1–maxPages are accessible.
   * Pass `undefined` (or omit) for unlimited access (standard tier).
   */
  maxPages?: number
}

export function PdfViewer({ src, title = 'Study Guide (PDF)', maxPages }: PdfViewerProps) {
  const [numPages, setNumPages]   = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  const containerRef  = useRef<HTMLDivElement>(null)
  const pageAreaRef   = useRef<HTMLDivElement>(null)

  const isLimited   = typeof maxPages === 'number'
  const lastAllowed = isLimited && numPages > 0 ? Math.min(maxPages, numPages) : numPages
  const atLastAllowed = pageNumber >= lastAllowed && lastAllowed > 0
  const hasMorePages  = numPages > lastAllowed

  // Measure the page area width so react-pdf scales the PDF to fit
  useEffect(() => {
    const el = pageAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFullscreen])

  // Sync isFullscreen with browser fullscreen events (e.g. user presses Esc)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [])

  const onDocumentLoadError = useCallback(() => {
    setLoading(false)
    setError(true)
  }, [])

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1))
  const goToNext = () => setPageNumber((p) => Math.min(lastAllowed, p + 1))

  return (
    <div
      ref={containerRef}
      className={[
        'rounded-xl border overflow-hidden shadow-sm select-none flex flex-col',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 bg-neutral-900' : '',
      ].join(' ')}
    >
      {/* ── Header bar ── */}
      <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2 shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1 truncate">
          {title}
        </p>
        {isLimited && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-0.5 shrink-0">
            Preview · {maxPages} page{maxPages !== 1 ? 's' : ''}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
      </div>

      {/* ── PDF canvas ── */}
      <div
        ref={pageAreaRef}
        className={[
          'relative flex flex-col items-center overflow-y-auto',
          isFullscreen
            ? 'flex-1 bg-neutral-800'
            : 'bg-neutral-100 dark:bg-neutral-900 min-h-125',
        ].join(' ')}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Failed to load PDF.</p>
          </div>
        )}

        <Document
          file={src}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          <Page
            pageNumber={pageNumber}
            width={containerWidth > 0 ? containerWidth : undefined}
            renderTextLayer
            renderAnnotationLayer={false}
            className="mx-auto shadow-md"
          />
        </Document>
      </div>

      {/* ── Navigation bar ── */}
      {!loading && !error && numPages > 0 && (
        <div className="border-t bg-muted/30 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={goToPrev}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
            Page {pageNumber} of {isLimited ? `${lastAllowed} (preview)` : numPages}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={goToNext}
            disabled={atLastAllowed}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* ── Upgrade CTA when at the page limit ── */}
      {isLimited && atLastAllowed && hasMorePages && (
        <div className="border-t bg-card px-6 py-6 flex flex-col items-center gap-3 text-center shrink-0">
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
      )}
    </div>
  )
}
