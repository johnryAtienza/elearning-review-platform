import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Library, Truck, CheckCircle2, Clock, XCircle, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { booksApi } from '@/services/booksApi'
import { ROUTES } from '@/constants/routes'
import { formatPHP } from '@/utils/money'
import type { BookOrder, OrderStatus } from '@/features/books/types'

/**
 * Compact "My Books" panel for the Dashboard.
 *
 * Shows the most recent N orders with status. Renders nothing when the
 * user has no orders (so the dashboard layout isn't padded with empty
 * sections for non-buyers).
 */
export function MyBooksCard({ limit = 5 }: { limit?: number }) {
  const [orders, setOrders]   = useState<BookOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    booksApi.getMyOrders()
      .then((data) => { if (!cancelled) setOrders(data) })
      .catch(() => { /* silent — Dashboard already shows other data */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Library className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            My books
          </h2>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
    )
  }

  // Hide the section entirely when the user has never bought a book.
  if (orders.length === 0) return null

  const visible = orders.slice(0, limit)
  const hasMore = orders.length > limit

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Library className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            My books
          </h2>
        </div>
        <Link to={ROUTES.BOOKS} className="text-xs font-medium text-primary hover:underline">
          Browse books →
        </Link>
      </div>

      <ul className="divide-y -mx-5 sm:-mx-6">
        {visible.map((order) => (
          <li key={order.id} className="px-5 sm:px-6 py-3 flex items-center gap-3">
            <StatusIcon status={order.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {order.bookTitle ?? '(book)'}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {new Date(order.orderedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {formatPHP(order.totalCentavos)}
                {order.trackingNo && (
                  <> · <span className="font-mono">{order.trackingNo}</span></>
                )}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          + {orders.length - limit} more order{orders.length - limit === 1 ? '' : 's'}
        </p>
      )}
    </section>
  )
}

function StatusIcon({ status }: { status: OrderStatus }) {
  const iconClass = 'size-5 shrink-0'
  switch (status) {
    case 'pending':   return <Clock        className={`${iconClass} text-warning`} />
    case 'paid':      return <Package      className={`${iconClass} text-primary`} />
    case 'shipped':   return <Truck        className={`${iconClass} text-primary`} />
    case 'delivered': return <CheckCircle2 className={`${iconClass} text-success`} />
    case 'cancelled': return <XCircle      className={`${iconClass} text-muted-foreground`} />
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'pro'; label: string }> = {
    pending:   { variant: 'warning',     label: 'Pending' },
    paid:      { variant: 'pro',         label: 'Paid' },
    shipped:   { variant: 'default',     label: 'Shipped' },
    delivered: { variant: 'success',     label: 'Delivered' },
    cancelled: { variant: 'secondary',   label: 'Cancelled' },
  }
  const cfg = map[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
