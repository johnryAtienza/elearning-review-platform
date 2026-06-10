import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { BookCover } from '@/features/books/components/BookCover'
import { booksApi } from '@/services/booksApi'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'
import { formatPHP } from '@/utils/money'
import type { Book } from '@/features/books/types'
import { cn } from '@/utils/cn'

/**
 * Public catalog of published books. Mobile-first grid: 2 cols on phone,
 * 3 on tablet, 4 on desktop. Each card links to /book/:id.
 */
export function BooksPage() {
  const [books, setBooks]     = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    booksApi.getPublished()
      .then((b) => { if (!cancelled) setBooks(b) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load books.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      <CanonicalLink path={ROUTES.BOOKS} owner="landing" />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Reviewer books
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Hard-copy reviewers
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Printed reviewers shipped nationwide. Each book pairs with the
          online platform for daily MC drills and weekly catch-up sessions.
        </p>
      </header>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="aspect-[3/4] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookCard({ book }: { book: Book }) {
  const outOfStock = book.stock <= 0
  return (
    <Link
      to={ROUTES.BOOK(book.id)}
      className={cn(
        'group flex flex-col rounded-xl border bg-card overflow-hidden transition-colors',
        'hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <BookCover src={book.coverUrl} alt={book.title} className="aspect-[3/4]">
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="warning">Out of stock</Badge>
          </div>
        )}
      </BookCover>
      <div className="p-3 space-y-1.5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
        )}
        <p className="mt-auto pt-2 text-base font-bold text-primary tabular-nums">
          {formatPHP(book.priceCentavos)}
        </p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-muted p-4">
        <BookOpen className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">No books available yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Check back soon — we're preparing the printed reviewers for shipment.
        </p>
      </div>
    </div>
  )
}
