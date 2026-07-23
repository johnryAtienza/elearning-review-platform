import { useState } from 'react'
import { X, Loader2, Truck, CheckCircle2, XCircle, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DestructiveConfirmModal } from './AdminTable'
import {
  updateOrderStatus,
  cancelOrderAndRestock,
} from '@s-class/api/admin.service'
import { formatPHP } from '@/utils/money'
import { cn } from '@/utils/cn'
import type { BookOrder, OrderStatus } from '@/features/books/types'

interface OrderDetailModalProps {
  order: BookOrder
  onClose: () => void
  onUpdated: (next: BookOrder) => void
}

export function OrderDetailModal({ order, onClose, onUpdated }: OrderDetailModalProps) {
  const [trackingNo, setTrackingNo] = useState<string>(order.trackingNo ?? '')
  const [working, setWorking] = useState<OrderStatus | 'cancel' | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function handleAdvance(next: OrderStatus) {
    setWorking(next)
    setError(null)
    try {
      const opts = next === 'shipped' ? { trackingNo: trackingNo.trim() || undefined } : {}
      await updateOrderStatus(order.id, next, opts)
      const stamp = new Date().toISOString()
      onUpdated({
        ...order,
        status: next,
        trackingNo: next === 'shipped' ? (trackingNo.trim() || null) : order.trackingNo,
        paidAt:      next === 'paid'      ? stamp : order.paidAt,
        shippedAt:   next === 'shipped'   ? stamp : order.shippedAt,
        deliveredAt: next === 'delivered' ? stamp : order.deliveredAt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order.')
    } finally {
      setWorking(null)
    }
  }

  async function handleCancel() {
    setConfirmCancel(false)
    setWorking('cancel')
    setError(null)
    try {
      await cancelOrderAndRestock(order)
      onUpdated({
        ...order,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order.')
    } finally {
      setWorking(null)
    }
  }

  const addr = order.shippingAddress
  const isFinal = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-xl border bg-background shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Order detail</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {order.id.slice(0, 8)}…
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status banner */}
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-xs text-muted-foreground">
              Ordered {new Date(order.orderedAt).toLocaleString()}
            </span>
          </div>

          {/* Item */}
          <section className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</p>
            <p className="font-medium">{order.bookTitle ?? '(book)'}{order.bookAuthor && <span className="text-muted-foreground"> — {order.bookAuthor}</span>}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {order.qty} × {formatPHP(order.unitPriceCentavos)} = <span className="font-semibold text-foreground">{formatPHP(order.totalCentavos)}</span>
            </p>
          </section>

          {/* Shipping address */}
          <section className="rounded-lg border bg-card p-4 space-y-1.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship to</p>
            <p className="font-medium">{addr.fullName}</p>
            <p className="text-muted-foreground">{addr.phone}</p>
            <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
            <p className="text-muted-foreground">{addr.city}, {addr.province}, {addr.region} {addr.postalCode}</p>
            {addr.notes && (
              <p className="text-muted-foreground italic mt-2">Note: {addr.notes}</p>
            )}
          </section>

          {/* Tracking number */}
          {(order.status === 'paid' || order.status === 'shipped') && (
            <section className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tracking number
              </label>
              <Input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="e.g. JT1234567890"
                disabled={!!working || isFinal}
              />
            </section>
          )}

          {/* Status timestamps */}
          <section className="rounded-lg border bg-card/40 p-4 space-y-1 text-xs text-muted-foreground">
            {order.paidAt      && <p>Paid: {new Date(order.paidAt).toLocaleString()}</p>}
            {order.shippedAt   && <p>Shipped: {new Date(order.shippedAt).toLocaleString()}{order.trackingNo && ` · ${order.trackingNo}`}</p>}
            {order.deliveredAt && <p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}
            {order.cancelledAt && <p>Cancelled: {new Date(order.cancelledAt).toLocaleString()}</p>}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Action row */}
        {!isFinal && (
          <div className="shrink-0 flex flex-wrap justify-end gap-2 border-t px-6 py-4">
            {order.status === 'pending' && (
              <Button
                variant="outline"
                onClick={() => handleAdvance('paid')}
                disabled={!!working}
              >
                {working === 'paid' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                Mark as paid
              </Button>
            )}
            {order.status === 'paid' && (
              <Button
                onClick={() => handleAdvance('shipped')}
                disabled={!!working}
              >
                {working === 'shipped' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Truck className="mr-2 size-4" />}
                Mark as shipped
              </Button>
            )}
            {order.status === 'shipped' && (
              <Button
                onClick={() => handleAdvance('delivered')}
                disabled={!!working}
              >
                {working === 'delivered' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PackageCheck className="mr-2 size-4" />}
                Mark as delivered
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              disabled={!!working}
              className="text-destructive hover:text-destructive"
            >
              {working === 'cancel' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <XCircle className="mr-2 size-4" />}
              Cancel order
            </Button>
          </div>
        )}
      </div>

      {confirmCancel && (
        <DestructiveConfirmModal
          title="Cancel order?"
          description={
            <>
              Cancel order <span className="font-mono">{order.id.slice(0, 8)}...</span>
              {order.bookTitle ? <> for <strong>{order.bookTitle}</strong></> : null}
              ? This will mark the order as cancelled and restock the book quantity.
            </>
          }
          confirmLabel="Confirm Cancel"
          isWorking={working === 'cancel'}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'pro' | 'outline'; label: string }> = {
    pending:   { variant: 'warning',    label: 'Pending' },
    paid:      { variant: 'pro',        label: 'Paid' },
    shipped:   { variant: 'default',    label: 'Shipped' },
    delivered: { variant: 'success',    label: 'Delivered' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  }
  const cfg = map[status]
  return <Badge variant={cfg.variant} className={cn(status === 'cancelled' && 'opacity-80')}>{cfg.label}</Badge>
}
