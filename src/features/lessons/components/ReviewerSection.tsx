import type { ReviewerContent } from '@/features/lessons/types'

interface ReviewerSectionProps {
  content?: ReviewerContent
  /** Presigned R2 URL for the reviewer PDF. Shown as an embedded viewer. */
  pdfUrl?: string
  visible: boolean
}

export function ReviewerSection({ content, pdfUrl, visible }: ReviewerSectionProps) {
  if (!content && !pdfUrl) return null

  return (
    <div
      className={[
        'space-y-5 transition-all duration-700 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
      aria-hidden={!visible}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Reviewer
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* PDF viewer — shown when a signed URL is available */}
      {pdfUrl && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Study Guide (PDF)
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab ↗
            </a>
          </div>
          <iframe
            src={pdfUrl}
            title="Reviewer PDF"
            className="w-full h-[600px] bg-white"
            // Prevent right-click / save-as inside the iframe
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      )}

      {/* Structured text content */}
      {content && (
        <>
          <div className="rounded-xl border bg-muted/30 p-5 space-y-2">
            <h3 className="text-sm font-semibold">Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.summary}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Key Points</h3>
            <ul className="space-y-2">
              {content.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
