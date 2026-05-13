import { BookOpen } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BookCoverProps {
  src?: string | null
  alt: string
  /** Optional className overrides — sizing, rounding, etc. */
  className?: string
  children?: React.ReactNode
}

/**
 * Book cover with a graceful fallback when no image is uploaded yet.
 * Mirrors CourseThumbnail's pattern (gradient + lucide icon when no src).
 */
export function BookCover({ src, alt, className, children }: BookCoverProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-card flex items-center justify-center',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-primary/30 to-card flex items-center justify-center">
          <BookOpen className="size-1/3 max-w-12 text-foreground/40" />
        </div>
      )}
      {children}
    </div>
  )
}
