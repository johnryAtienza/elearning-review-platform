import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  label: string
  value: number | undefined
  icon: React.ElementType
  /** Small descriptive line below the value. */
  sub?: string
  loading: boolean
  /** Tailwind text color class for the icon, e.g. "text-blue-600" */
  iconColor: string
  /** Tailwind bg class for the icon container, e.g. "bg-blue-50 dark:bg-blue-950/30" */
  iconBg: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  loading,
  iconColor,
  iconBg,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground leading-tight">{label}</p>
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
