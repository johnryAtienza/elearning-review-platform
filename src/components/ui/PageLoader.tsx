import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PageLoaderProps {
  variant?: 'fullscreen' | 'inline'
  label?: string
}

export function PageLoader({ variant = 'fullscreen', label = 'Loading' }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        variant === 'fullscreen' ? 'min-h-screen w-full bg-background' : 'min-h-[40vh] w-full',
      )}
    >
      <div className="relative flex items-center justify-center">
        <img
          src="/elearning-logo.png"
          alt=""
          aria-hidden="true"
          className="size-12 animate-pulse opacity-80"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>{label}…</span>
      </div>
    </div>
  )
}
