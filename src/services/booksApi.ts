/**
 * booksApi.ts
 *
 * Public client for the books catalog + book purchase flow.
 *
 * Provider routing matches the existing pattern (mock / supabase / rest)
 * but books are Supabase-only for v1; mock mode just returns empty data.
 *
 * Edge Function calls (createCheckout, verifyPayment) are always Supabase.
 */

import config from '@/config'
import { supabase } from './supabaseClient'
import * as bookService from './book.service'
import type {
  Book,
  BookOrder,
  CreateBookCheckoutBody,
  CreateBookCheckoutResponse,
  VerifyBookPaymentResponse,
} from '@/features/books/types'

export const booksApi = {
  // ── Catalog ────────────────────────────────────────────────────────────────

  async getPublished(): Promise<Book[]> {
    if (config.api.useMock)                  return []
    if (config.auth.provider === 'supabase') return bookService.getPublishedBooks()
    return []
  },

  async getById(id: string): Promise<Book | undefined> {
    if (config.api.useMock)                  return undefined
    if (config.auth.provider === 'supabase') return bookService.getBookById(id)
    return undefined
  },

  // ── Current user's orders ──────────────────────────────────────────────────

  async getMyOrders(): Promise<BookOrder[]> {
    if (config.api.useMock)                  return []
    if (config.auth.provider === 'supabase') return bookService.getMyOrders()
    return []
  },

  async getMyOrderById(id: string): Promise<BookOrder | undefined> {
    if (config.api.useMock)                  return undefined
    if (config.auth.provider === 'supabase') return bookService.getMyOrderById(id)
    return undefined
  },

  // ── PayMongo Edge Functions ────────────────────────────────────────────────

  /**
   * Create a PayMongo Checkout Session for a single book purchase.
   * Server creates a pending book_orders row and decrements stock atomically
   * before returning. Redirect the user to checkoutUrl to pay.
   */
  async createCheckout(body: CreateBookCheckoutBody): Promise<CreateBookCheckoutResponse> {
    if (config.api.useMock) {
      // Mock: skip PayMongo and pretend the order was created.
      return {
        checkoutUrl: `${window.location.origin}/payment-success?session_id=mock_book_session&kind=book`,
        sessionId:   'mock_book_session',
        orderId:     'mock_order',
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to purchase.')

    const { data, error } = await supabase.functions.invoke<CreateBookCheckoutResponse>('create-book-checkout', {
      body,
    })

    if (error) throw new Error(error.message ?? 'Failed to create book checkout session.')
    if (!data)  throw new Error('Empty response from book checkout service.')
    return data
  },

  /**
   * Verify a PayMongo book-purchase session and mark the order as paid.
   * Idempotent — safe to call multiple times for the same sessionId.
   */
  async verifyPayment(sessionId: string): Promise<VerifyBookPaymentResponse> {
    if (config.api.useMock || sessionId === 'mock_book_session') {
      return { orderId: 'mock_order', status: 'paid', alreadyProcessed: false }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Please log in to verify your order.')

    const { data, error } = await supabase.functions.invoke<VerifyBookPaymentResponse>('verify-book-payment', {
      body: { sessionId },
    })

    if (error) throw new Error(error.message ?? 'Order verification failed.')
    if (!data)  throw new Error('Empty response from order verification service.')
    return data
  },
}
