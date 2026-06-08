import { Info } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  label: string
  value: number | undefined
  icon: React.ElementType
  /** Small descriptive line below the value. */
  sub?: string
  loading: boolean
  /** Tailwind text color class for the icon, e.g. "text-primary" or "text-muted-foreground" */
  iconColor: string
  /** Tailwind bg class for the icon container, e.g. "bg-primary/15" or "bg-muted" */
  iconBg: string
  /** Optional explanation shown on hover of a small info icon next to the label. */
  tooltip?: string
  /**
   * Tooltip horizontal anchor relative to the info icon.
   * 'start' (default) extends the tooltip rightward; 'end' extends it leftward.
   * Use 'end' for cards in the right half of a row so the 256px tooltip stays
   * inside the layout instead of forcing the parent to scroll horizontally.
   */
  tooltipAlign?: 'start' | 'end'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  loading,
  iconColor,
  iconBg,
  tooltip,
  tooltipAlign = 'start',
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-muted-foreground leading-tight">{label}</p>
          {tooltip && (
            <span className="relative group/info inline-flex shrink-0">
              <Info
                aria-label={tooltip}
                className="size-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors"
              />
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute top-full mt-1.5 z-50',
                  tooltipAlign === 'end' ? 'right-0' : 'left-0',
                  'w-64 rounded-md border bg-popover text-popover-foreground shadow-md',
                  'px-3 py-2 text-xs leading-relaxed',
                  'opacity-0 group-hover/info:opacity-100 transition-opacity',
                )}
              >
                {tooltip}
              </span>
            </span>
          )}
        </div>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconBg,
          )}
        >
          <Icon className={cn('size-4', iconColor)} />
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {value ?? '—'}
        </p>
      )}

      {sub && !loading && (
        <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  )
}
