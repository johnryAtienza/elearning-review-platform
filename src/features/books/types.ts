/**
 * Book + book-order types shared by browser and admin code.
 *
 * Naming + casing matches the existing Lesson / Course types so the same
 * patterns (mappers in src/services/*.ts, modal forms, etc.) work without
 * special-casing.
 */

export interface Book {
  id: string
  title: string
  author: string
  /** Optional ISBN-10/13. */
  isbn?: string | null
  description: string
  /** Public CDN URL of the cover image (or null if no cover uploaded). */
  coverUrl?: string | null
  /** Sale price in centavos (PHP). ₱500 = 50000. */
  priceCentavos: number
  /** Available units. May be 0. */
  stock: number
  isPublished: boolean
  createdAt?: string
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface ShippingAddress {
  fullName:    string
  phone:       string
  line1:       string
  line2?:      string
  city:        string
  province:    string
  region:      string
  postalCode:  string
  notes?:      string
}

export interface BookOrder {
  id: string
  userId: string
  bookId: string
  /** Snapshot of book metadata at order time, optional join when fetched. */
  bookTitle?: string
  bookAuthor?: string
  qty: number
  unitPriceCentavos: number
  totalCentavos: number
  shippingAddress: ShippingAddress
  status: OrderStatus
  paymongoSessionId?: string | null
  trackingNo?: string | null
  orderedAt: string
  paidAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
}

/** Payload accepted by the create-book-checkout Edge Function. */
export interface CreateBookCheckoutBody {
  bookId: string
  qty: number
  shippingAddress: ShippingAddress
  successUrl: string
  cancelUrl:  string
}

export interface CreateBookCheckoutResponse {
  checkoutUrl: string
  sessionId:   string
  orderId:     string
}

export interface VerifyBookPaymentResponse {
  orderId:          string
  status:           OrderStatus
  alreadyProcessed: boolean
}
