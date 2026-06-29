/**
 * book.service.ts
 *
 * Supabase queries for the books catalog and the user's own orders.
 *
 * RLS guarantees:
 * - getPublishedBooks  → only status='published' rows are returned (RLS).
 * - getBookById (any)  → admins see drafts; anyone authenticated sees published.
 * - getMyOrders        → only auth.uid() = user_id rows (RLS).
 *
 * Order CREATION is handled exclusively by the create-book-checkout Edge
 * Function (which uses the service role and bypasses RLS). The browser
 * never INSERTs into book_orders.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import { normalizeBookCoverDisplayUrl } from './bookCoverUrl'
import { normalizeBookTitle } from './bookContent'
import type { Book, BookOrder, OrderStatus, ShippingAddress } from '@s-class/types/books'

// ── Raw DB row shapes ────────────────────────────────────────────────────────

interface BookRow {
  id:              string
  title:           string
  author:          string
  isbn:            string | null
  description:     string
  cover_url:       string | null
  price_centavos:  number
  stock:           number
  status:          'draft' | 'published' | 'archived'
  created_at:      string
}

interface OrderRow {
  id:                    string
  user_id:               string
  book_id:               string
  qty:                   number
  unit_price_centavos:   number
  total_centavos:        number
  shipping_address:      ShippingAddress
  status:                OrderStatus
  paymongo_session_id:   string | null
  tracking_no:           string | null
  ordered_at:            string
  paid_at:               string | null
  shipped_at:            string | null
  delivered_at:          string | null
  cancelled_at:          string | null
  /** Optional join from books table. */
  books?: { title: string; author: string } | null
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toBook(row: BookRow): Book {
  return {
    id:             row.id,
    title:          normalizeBookTitle(row.title),
    author:         row.author,
    isbn:           row.isbn,
    description:    row.description,
    coverUrl:       normalizeBookCoverDisplayUrl(row.cover_url),
    priceCentavos:  row.price_centavos,
    stock:          row.stock,
    status:         row.status,
    createdAt:      row.created_at,
  }
}

function toOrder(row: OrderRow): BookOrder {
  return {
    id:                 row.id,
    userId:             row.user_id,
    bookId:             row.book_id,
    bookTitle:          row.books?.title ? normalizeBookTitle(row.books.title) : undefined,
    bookAuthor:         row.books?.author,
    qty:                row.qty,
    unitPriceCentavos:  row.unit_price_centavos,
    totalCentavos:      row.total_centavos,
    shippingAddress:    row.shipping_address,
    status:             row.status,
    paymongoSessionId:  row.paymongo_session_id,
    trackingNo:         row.tracking_no,
    orderedAt:          row.ordered_at,
    paidAt:             row.paid_at,
    shippedAt:          row.shipped_at,
    deliveredAt:        row.delivered_at,
    cancelledAt:        row.cancelled_at,
  }
}

// ── Catalog queries ──────────────────────────────────────────────────────────

/** Public catalog. Only published books are returned (enforced by RLS). */
export async function getPublishedBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, isbn, description, cover_url, price_centavos, stock, status, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw new ApiError(500, 'BOOKS_FETCH_FAILED', error.message)
  return (data as BookRow[]).map(toBook)
}

/** Book detail (public). Returns undefined if not found / not visible to caller. */
export async function getBookById(bookId: string): Promise<Book | undefined> {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, isbn, description, cover_url, price_centavos, stock, status, created_at')
    .eq('id', bookId)
    .maybeSingle()

  if (error) throw new ApiError(500, 'BOOK_FETCH_FAILED', error.message)
  return data ? toBook(data as BookRow) : undefined
}

// ── Order queries (current user) ─────────────────────────────────────────────

/** All orders belonging to the currently authenticated user. */
export async function getMyOrders(): Promise<BookOrder[]> {
  const { data, error } = await supabase
    .from('book_orders')
    .select(`
      id, user_id, book_id, qty, unit_price_centavos, total_centavos,
      shipping_address, status, paymongo_session_id, tracking_no,
      ordered_at, paid_at, shipped_at, delivered_at, cancelled_at,
      books(title, author)
    `)
    .order('ordered_at', { ascending: false })

  if (error) throw new ApiError(500, 'ORDERS_FETCH_FAILED', error.message)
  return (data as unknown as OrderRow[]).map(toOrder)
}

/** Single order owned by the current user. */
export async function getMyOrderById(orderId: string): Promise<BookOrder | undefined> {
  const { data, error } = await supabase
    .from('book_orders')
    .select(`
      id, user_id, book_id, qty, unit_price_centavos, total_centavos,
      shipping_address, status, paymongo_session_id, tracking_no,
      ordered_at, paid_at, shipped_at, delivered_at, cancelled_at,
      books(title, author)
    `)
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw new ApiError(500, 'ORDER_FETCH_FAILED', error.message)
  return data ? toOrder(data as unknown as OrderRow) : undefined
}
