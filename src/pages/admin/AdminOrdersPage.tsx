import { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Loader2, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderDetailModal, StatusBadge } from '@/features/admin/components/OrderDetailModal'
import {
  AdminTableHeader, EmptyState, ADMIN_ROW_BASE, Tip, LoadError,
  type ColConfig,
} from '@/features/admin/components/AdminTable'
import { getAdminOrders } from '@/services/admin.service'
import { formatPHP } from '@/utils/money'
import type { BookOrder, OrderStatus } from '@/features/books/types'

const GRID_COLS = 'grid-cols-[1fr_8rem_8rem_6rem_4rem]'

const HEADER_COLS: ColConfig[] = [
  { label: 'Order' },
  { label: 'Customer', smOnly: true },
  { label: 'Status',   center: true },
  { label: 'Total',    center: true },
  { label: '',         center: true },
]

const STATUS_FILTERS: Array<OrderStatus | 'all'> = ['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled']

export function AdminOrdersPage() {
  const [orders,    setOrders]    = useState<BookOrder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<OrderStatus | 'all'>('all')
  const [openOrder, setOpenOrder] = useState<BookOrder | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getAdminOrders()
      .then((data) => { setOrders(data); setLoading(false) })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load orders.')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false
      if (!q) return true
      return (
        o.id.toLowerCase().includes(q)
        || o.bookTitle?.toLowerCase().includes(q)
        || o.shippingAddress.fullName.toLowerCase().includes(q)
        || o.trackingNo?.toLowerCase().includes(q)
      )
    })
  }, [orders, search, filter])

  function handleUpdated(next: BookOrder) {
    setOrders((prev) => prev.map((o) => o.id === next.id ? next : o))
    setOpenOrder(next)
  }

  const counts = useMemo(() => {
    const c: Record<OrderStatus | 'all', number> = {
      all: orders.length, pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0,
    }
    for (const o of orders) c[o.status]++
    return c
  }, [orders])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${orders.length} total · ${counts.pending} pending · ${counts.paid} paid · ${counts.shipped} shipped`}
          </p>
        </div>
      </div>

      <LoadError message={loadError} />

      {/* Search + status filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order id, book, customer, tracking…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? 'default' : 'outline'}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 text-xs opacity-70 tabular-nums">{counts[s]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <AdminTableHeader cols={HEADER_COLS} gridCols={GRID_COLS} />

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={orders.length === 0 ? 'No orders yet' : 'No orders match your filter'}
            description={orders.length === 0
              ? 'Orders appear here when a customer completes checkout.'
              : 'Try a different search or status filter.'}
          />
        ) : (
          <div className="divide-y">
            {filtered.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={() => setOpenOrder(order)} />
            ))}
          </div>
        )}
      </div>

      {openOrder && (
        <OrderDetailModal
          order={openOrder}
          onClose={() => setOpenOrder(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

function OrderRow({ order, onOpen }: { order: BookOrder; onOpen: () => void }) {
  return (
    <div className={`${ADMIN_ROW_BASE} ${GRID_COLS}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{order.bookTitle ?? '(book)'}</p>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
          {order.id.slice(0, 8)}… · {new Date(order.orderedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="hidden sm:block min-w-0 text-sm truncate">
        {order.shippingAddress.fullName}
      </div>

      <span className="flex justify-center">
        <StatusBadge status={order.status} />
      </span>

      <span className="flex justify-center text-sm font-semibold tabular-nums">
        {formatPHP(order.totalCentavos)}
      </span>

      <div className="flex items-center justify-end">
        <Tip label="Open order" align="right">
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpen}>
            {order.status === 'pending'
              ? <Loader2 className="size-4 animate-spin opacity-50" />
              : <ExternalLink className="size-4" />}
          </Button>
        </Tip>
      </div>
    </div>
  )
}
