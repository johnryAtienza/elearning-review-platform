import { useState, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BookCoverProps {
  src?: string | null
  alt: string
  /** Optional className overrides — sizing, rounding, etc. */
  className?: string
  children?: ReactNode
}

const EMPTY_IMAGE_VALUES = new Set(['', 'null', 'undefined'])
const ALLOWED_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:', 'data:', 'blob:'])

function normalizeBookCoverUrl(src?: string | null): string | null {
  if (typeof src !== 'string') return null

  const trimmed = src.trim()
  if (EMPTY_IMAGE_VALUES.has(trimmed.toLowerCase())) return null

  if (trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('covers/')) return `/${trimmed}`

  try {
    const url = new URL(trimmed)
    return ALLOWED_ABSOLUTE_PROTOCOLS.has(url.protocol) ? trimmed : null
  } catch {
    return null
  }
}

/**
 * Book cover with a graceful fallback while loading, missing, or failed.
 */
export function BookCover({ src, alt, className, children }: BookCoverProps) {
  const coverUrl = normalizeBookCoverUrl(src)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const shouldLoadImage = Boolean(coverUrl) && failedSrc !== coverUrl
  const shouldShowImage = shouldLoadImage && loadedSrc === coverUrl

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-card flex items-center justify-center',
        className,
      )}
    >
      {!shouldShowImage && (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 bg-linear-to-br from-primary/30 to-card flex items-center justify-center"
        >
          <BookOpen className="size-1/3 max-w-12 text-foreground/40" aria-hidden="true" />
        </div>
      )}
      {shouldLoadImage && coverUrl ? (
        <img
          key={coverUrl}
          src={coverUrl}
          alt={alt}
          aria-hidden={!shouldShowImage}
          loading="lazy"
          onLoad={() => {
            setFailedSrc(null)
            setLoadedSrc(coverUrl)
          }}
          onError={() => {
            setLoadedSrc(null)
            setFailedSrc(coverUrl)
          }}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-200',
            shouldShowImage ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
      {children}
    </div>
  )
}
