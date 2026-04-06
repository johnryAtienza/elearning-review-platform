import { cn } from '@/utils/cn'

interface CourseThumbnailProps {
  src?: string | null
  alt?: string
  /** Gradient classes used as the fallback background (e.g. `course.thumbnail`). */
  gradient?: string
  className?: string
  /** Any overlay content (badges, etc.) rendered on top. */
  children?: React.ReactNode
}

/**
 * Renders a course image.
 * - If `src` is set   → shows the real image.
 * - Otherwise         → shows the gradient background + centered logo watermark.
 */
export function CourseThumbnail({
  src,
  alt = 'Course',
  gradient,
  className,
  children,
}: CourseThumbnailProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        gradient ? `bg-linear-to-br ${gradient}` : 'bg-muted',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/elearning-logo.png"
            alt="Default course thumbnail"
            className="h-1/2 w-auto object-contain opacity-20"
          />
        </div>
      )}
      {children}
    </div>
  )
}
