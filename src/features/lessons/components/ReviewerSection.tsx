import { Lock } from 'lucide-react'
import { PdfViewer } from './PdfViewer'
import type { ReviewerContent } from '@/features/lessons/types'
import type { SubscriptionTier } from '@/features/subscription/types'
import { getPermissions, isUnlimited } from '@/features/subscription/services/accessControl'

interface ReviewerSectionProps {
  content?: ReviewerContent
  /** Presigned R2 URL for the reviewer PDF. */
  pdfUrl?: string
  /**
   * true  = video completed (subscribed) or free tier (always shown with limits)
   * false = subscribed user hasn't finished the video yet → show locked placeholder
   */
  visible: boolean
  /** Determines PDF page limit and download restrictions */
  tier: SubscriptionTier
}

export function ReviewerSection({ content, pdfUrl, visible, tier }: ReviewerSectionProps) {
  if (!content && !pdfUrl) return null

  const permissions = getPermissions(tier)
  const pdfMaxPages = isUnlimited(permissions.pdfMaxPages) ? undefined : permissions.pdfMaxPages

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          Reviewer
          {!visible && <Lock className="size-3" />}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Locked: subscribed user hasn't finished the video */}
      {!visible ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 flex flex-col items-center gap-3 text-center">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Reviewer Locked</p>
            <p className="text-xs text-muted-foreground">
              Finish watching the video to unlock the reviewer.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* PDF viewer — shown when a signed URL is available */}
          {pdfUrl && (
            <PdfViewer
              src={pdfUrl}
              maxPages={pdfMaxPages}
            />
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
      )}
    </div>
  )
}
