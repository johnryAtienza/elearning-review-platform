import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

interface UpgradeOverlayProps {
  title?: string
  description?: string
  /** Extra Tailwind classes for positioning/sizing */
  className?: string
}

/**
 * Reusable upgrade overlay.
 * Parent must have `position: relative` (or `relative` class) and `overflow-hidden`.
 */
export function UpgradeOverlay({
  title = 'Upgrade to Standard',
  description = 'Subscribe to the Standard plan for full access.',
  className,
}: UpgradeOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-4',
        'bg-background/85 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-6 text-primary" />
      </div>

      <div className="space-y-1 text-center px-6">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
      </div>

      <Button asChild>
        <Link to={ROUTES.SUBSCRIPTION}>Upgrade to Standard</Link>
      </Button>
    </div>
  )
}
