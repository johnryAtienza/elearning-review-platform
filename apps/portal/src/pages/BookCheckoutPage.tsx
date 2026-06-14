import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { BookCover } from '@/features/books/components/BookCover'
import { booksApi } from '@s-class/api/booksApi'
import { useAuthStore } from '@s-class/auth/authStore'
import { ROUTES } from '@/constants/routes'
import { EXTERNAL } from '@s-class/constants/urls'
import { formatPHP } from '@/utils/money'
import type { Book, ShippingAddress } from '@/features/books/types'

const REQUIRED_FIELDS: Array<keyof ShippingAddress> = [
  'fullName', 'phone', 'line1', 'city', 'province', 'region', 'postalCode',
]

const EMPTY_ADDRESS: ShippingAddress = {
  fullName:   '',
  phone:      '',
  line1:      '',
  line2:      '',
  city:       '',
  province:   '',
  region:     '',
  postalCode: '',
  notes:      '',
}

export function BookCheckoutPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [book, setBook]       = useState<Book | undefined>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Pre-fill name + phone from profile when available.
  const [address, setAddress] = useState<ShippingAddress>(() => ({
    ...EMPTY_ADDRESS,
    fullName: user?.name ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    booksApi.getById(bookId)
      .then((b) => {
        if (cancelled) return
        if (!b) setNotFound(true)
        else setBook(b)
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load book.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bookId])

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (notFound)         return <Navigate to={ROUTES.BOOKS} replace />
  if (loadError)        return <ErrorMessage message={loadError} />

  if (loading || !book) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (book.stock <= 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center space-y-4">
        <h1 className="text-2xl font-bold">Out of stock</h1>
        <p className="text-muted-foreground">
          This book just sold out. Please check back soon or pick another from the catalog.
        </p>
        <Button asChild>
          <Link to={ROUTES.BOOKS}>Back to books</Link>
        </Button>
      </div>
    )
  }

  function update<K extends keyof ShippingAddress>(key: K, value: ShippingAddress[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    for (const k of REQUIRED_FIELDS) {
      if (!address[k] || (address[k] as string).trim() === '') {
        return `Please fill in: ${labelForField(k)}.`
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const err = validate()
    if (err) { setSubmitError(err); return }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const trimmed: ShippingAddress = {
        fullName:   address.fullName.trim(),
        phone:      address.phone.trim(),
        line1:      address.line1.trim(),
        line2:      address.line2?.trim() || undefined,
        city:       address.city.trim(),
        province:   address.province.trim(),
        region:     address.region.trim(),
        postalCode: address.postalCode.trim(),
        notes:      address.notes?.trim() || undefined,
      }

      // Payment success/cancel routes live under the same-origin student portal.
      const portalOrigin = EXTERNAL.portal()
      const successUrl = `${portalOrigin}${ROUTES.PAYMENT_SUCCESS}?session_id={CHECKOUT_SESSION_ID}&kind=book`
      const cancelUrl  = `${portalOrigin}${ROUTES.PAYMENT_CANCEL}`

      const { checkoutUrl } = await booksApi.createCheckout({
        bookId:          book!.id,
        qty:             1,
        shippingAddress: trimmed,
        successUrl,
        cancelUrl,
      })

      // For mock mode (checkoutUrl resolves to portal), strip the origin
      // and SPA-navigate; otherwise hand off to PayMongo.
      if (checkoutUrl.startsWith(portalOrigin)) {
        navigate(checkoutUrl.replace(portalOrigin, ''))
      } else {
        window.location.href = checkoutUrl
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to start checkout.')
      setSubmitting(false)
    }
  }

  const total = book.priceCentavos // qty=1 in v1

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <Link
        to={ROUTES.BOOK(book.id)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to book
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">

        {/* Address form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Shipping address
            </h2>

            <Field label="Full name" required>
              <Input
                value={address.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                disabled={submitting}
                autoComplete="name"
              />
            </Field>

            <Field label="Phone number" required>
              <Input
                type="tel"
                inputMode="tel"
                value={address.phone}
                onChange={(e) => update('phone', e.target.value)}
                disabled={submitting}
                placeholder="09xx xxx xxxx"
                autoComplete="tel"
              />
            </Field>

            <Field label="Address line 1" required>
              <Input
                value={address.line1}
                onChange={(e) => update('line1', e.target.value)}
                disabled={submitting}
                placeholder="House / unit no., building, street"
                autoComplete="address-line1"
              />
            </Field>

            <Field label="Address line 2 (optional)">
              <Input
                value={address.line2 ?? ''}
                onChange={(e) => update('line2', e.target.value)}
                disabled={submitting}
                placeholder="Subdivision, barangay"
                autoComplete="address-line2"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City" required>
                <Input
                  value={address.city}
                  onChange={(e) => update('city', e.target.value)}
                  disabled={submitting}
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="Province" required>
                <Input
                  value={address.province}
                  onChange={(e) => update('province', e.target.value)}
                  disabled={submitting}
                  autoComplete="address-level1"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Region" required>
                <Input
                  value={address.region}
                  onChange={(e) => update('region', e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. NCR, Region IV-A"
                />
              </Field>
              <Field label="Postal code" required>
                <Input
                  inputMode="numeric"
                  value={address.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                  disabled={submitting}
                  autoComplete="postal-code"
                />
              </Field>
            </div>

            <Field label="Delivery notes (optional)">
              <textarea
                value={address.notes ?? ''}
                onChange={(e) => update('notes', e.target.value)}
                rows={2}
                disabled={submitting}
                placeholder="Landmarks, gate code, preferred delivery time…"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Field>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </section>

          {/* Mobile-visible CTA (sticky-ish at bottom of viewport on small screens) */}
          <div className="lg:hidden">
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShoppingCart className="size-4 mr-2" />}
              {submitting ? 'Redirecting…' : `Pay ${formatPHP(total)}`}
            </Button>
          </div>
        </form>

        {/* Order summary */}
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 flex gap-3">
              <BookCover
                src={book.coverUrl}
                alt={book.title}
                className="aspect-[3/4] w-20 rounded-md border shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold leading-snug line-clamp-2">{book.title}</p>
                {book.author && <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>}
                <p className="text-xs text-muted-foreground">Qty 1</p>
              </div>
            </div>
            <div className="border-t px-4 py-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatPHP(book.priceCentavos)} />
              <Row label="Shipping" value="Free" muted />
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary tabular-nums">{formatPHP(total)}</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            form=""
            size="lg"
            className="w-full hidden lg:flex"
            disabled={submitting}
            onClick={(e) => {
              // Trigger form submit (the form is in a sibling column).
              e.preventDefault()
              const form = document.querySelector('form')
              form?.requestSubmit()
            }}
          >
            {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShoppingCart className="size-4 mr-2" />}
            {submitting ? 'Redirecting…' : `Pay ${formatPHP(total)}`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to PayMongo (GCash, Maya, or card) to complete payment.
          </p>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${muted ? 'text-muted-foreground' : ''}`}>{value}</span>
    </div>
  )
}

function labelForField(k: keyof ShippingAddress): string {
  const map: Record<keyof ShippingAddress, string> = {
    fullName: 'Full name', phone: 'Phone number', line1: 'Address line 1', line2: 'Address line 2',
    city: 'City', province: 'Province', region: 'Region', postalCode: 'Postal code', notes: 'Delivery notes',
  }
  return map[k]
}
