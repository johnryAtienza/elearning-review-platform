import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, BookOpen, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { BookCover } from '@/features/books/components/BookCover'
import { booksApi } from '@/services/booksApi'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { CanonicalLink } from '@/components/CanonicalLink'
import { formatPHP } from '@/utils/money'
import type { Book } from '@/features/books/types'

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [book, setBook]       = useState<Book | undefined>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    setLoading(true)
    booksApi.getById(bookId)
      .then((b) => {
        if (cancelled) return
        if (!b) setNotFound(true)
        else setBook(b)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load book.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bookId])

  if (notFound) return <Navigate to={ROUTES.BOOKS} replace />
  if (error)    return <ErrorMessage message={error} />

  if (loading || !book) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-8 sm:grid-cols-[14rem_1fr]">
          <Skeleton className="aspect-[3/4] w-full max-w-[14rem] rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    )
  }

  const outOfStock   = book.stock <= 0
  // Checkout lives on the portal subdomain (members-only). Use an absolute URL
  // so the CTA works whether the page is served from Landing's storefront or
  // Portal during the transition window. Same-origin nav on Portal becomes a
  // full-page reload — acceptable for a deliberate checkout click.
  const checkoutPath = ROUTES.BOOK_CHECKOUT(book.id)
  const checkoutHref = getAbsoluteUrl(
    isAuthenticated ? checkoutPath : withReturnParam(ROUTES.LOGIN, checkoutPath),
  )
  const checkoutLabel = isAuthenticated ? 'Buy Now' : 'Log in to buy'

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <CanonicalLink path={ROUTES.BOOK(book.id)} owner="landing" />
      <Link
        to={ROUTES.BOOKS}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        All books
      </Link>

      <div className="grid gap-8 sm:grid-cols-[14rem_1fr]">

        {/* Cover */}
        <BookCover
          src={book.coverUrl}
          alt={book.title}
          className="aspect-[3/4] w-full max-w-[14rem] rounded-xl border"
        />

        {/* Info */}
        <div className="space-y-5 min-w-0">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              {book.title}
            </h1>
            {book.author && (
              <p className="text-sm text-muted-foreground">by {book.author}</p>
            )}
            {book.isbn && (
              <p className="text-xs text-muted-foreground/80 font-mono">ISBN {book.isbn}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-primary tabular-nums">
              {formatPHP(book.priceCentavos)}
            </span>
            {outOfStock
              ? <Badge variant="warning">Out of stock</Badge>
              : book.stock <= 5
                ? <Badge variant="warning">Only {book.stock} left</Badge>
                : <Badge variant="success">In stock</Badge>}
          </div>

          {book.description ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {book.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description yet.</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" disabled={outOfStock}>
              {outOfStock
                ? <span>Out of stock</span>
                : <a href={checkoutHref}>
                    <ShoppingCart className="size-4 mr-2" />
                    {checkoutLabel}
                  </a>}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to={ROUTES.BOOKS}>
                <BookOpen className="size-4 mr-2" />
                More books
              </Link>
            </Button>
          </div>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              You'll be asked to sign in before completing the purchase.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function withReturnParam(path: string, returnTo: string): string {
  return `${path}?return=${encodeURIComponent(returnTo)}`
}
