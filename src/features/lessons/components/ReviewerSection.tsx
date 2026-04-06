import { PdfViewer } from './PdfViewer'
import type { ReviewerContent } from '@/features/lessons/types'
import type { SubscriptionTier } from '@/features/subscription/types'
import { getPermissions, isUnlimited } from '@/features/subscription/services/accessControl'

interface ReviewerSectionProps {
  content?: ReviewerContent
  /** Presigned R2 URL for the reviewer PDF. */
  pdfUrl?: string
  visible: boolean
  /** Determines PDF page limit and download restrictions */
  tier: SubscriptionTier
}

export function ReviewerSection({ content, pdfUrl, visible, tier }: ReviewerSectionProps) {
  if (!content && !pdfUrl) return null

  const permissions = getPermissions(tier)
  // Pass maxPages only when there is an actual limit (free tier)
  const pdfMaxPages = isUnlimited(permissions.pdfMaxPages) ? undefined : permissions.pdfMaxPages

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
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Reviewer
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* PDF viewer — shown when a signed URL is available */}
      {pdfUrl && (
        <PdfViewer
          src={pdfUrl}
          maxPages={pdfMaxPages}
        />
      )}

      {/* Structured text content — always shown in full (no page concept) */}
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
