/**
 * create-book-checkout — Supabase Edge Function
 *
 * Creates a PayMongo Checkout Session for a single book purchase.
 * Mirrors the existing create-checkout (subscription) shape but is a
 * separate function so the working subscription path is never modified.
 *
 * Flow:
 *   1. Verify JWT.
 *   2. Validate body (bookId, qty, shippingAddress, success/cancel URLs).
 *   3. Read book row from DB (must be published, in stock).
 *   4. Decrement stock atomically via decrement_book_stock RPC.
 *   5. Insert pending book_orders row.
 *   6. Create PayMongo session with metadata { kind: 'book', order_id }.
 *   7. Update the order row with paymongo_session_id.
 *   8. Return checkoutUrl + sessionId + orderId.
 *
 * Errors restock and roll back via best-effort cleanup. PayMongo session
 * failures restock; admin reconciles otherwise.
 *
 * POST /functions/v1/create-book-checkout
 * Authorization: Bearer <supabase-jwt>
 * Body: {
 *   bookId: string
 *   qty: number   // >= 1
 *   shippingAddress: {
 *     fullName: string
 *     phone: string
 *     line1: string
 *     line2?: string
 *     city: string
 *     province: string
 *     region: string
 *     postalCode: string
 *     notes?: string
 *   }
 *   successUrl: string   // e.g. https://app.com/payment-success?session_id={CHECKOUT_SESSION_ID}
 *   cancelUrl:  string   // e.g. https://app.com/payment-cancel
 * }
 *
 * Success 200: { checkoutUrl, sessionId, orderId }
 * Error   400: invalid body / out of stock / book not published
 * Error   401: missing / invalid JWT
 * Error   404: book not found
 * Error   500: server / DB error
 * Error   502: PayMongo API error
 *
 * Required Supabase secrets:
 *   PAYMONGO_SECRET_KEY=sk_test_xxx
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ShippingAddress {
  fullName:   string
  phone:      string
  line1:      string
  line2?:     string
  city:       string
  province:   string
  region:     string
  postalCode: string
  notes?:     string
}

function isShippingAddress(v: unknown): v is ShippingAddress {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const required = ['fullName', 'phone', 'line1', 'city', 'province', 'region', 'postalCode']
  for (const k of required) {
    if (typeof o[k] !== 'string' || (o[k] as string).trim() === '') return false
  }
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  // ── Verify JWT ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY')
  if (!paymongoSecretKey) {
    console.error('[create-book-checkout] PAYMONGO_SECRET_KEY is not set')
    return json({ error: 'Payment service not configured. Contact support.' }, 500)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    console.error('[create-book-checkout] Auth error:', authError?.message)
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: {
    bookId?: unknown
    qty?: unknown
    shippingAddress?: unknown
    successUrl?: unknown
    cancelUrl?: unknown
  }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const bookId = typeof body.bookId === 'string' ? body.bookId.trim() : ''
  const qty    = Number(body.qty ?? 1)

  if (!bookId)                       return json({ error: 'bookId is required' }, 400)
  if (!Number.isInteger(qty) || qty < 1) {
    return json({ error: 'qty must be a positive integer' }, 400)
  }

  if (!isShippingAddress(body.shippingAddress)) {
    return json({ error: 'shippingAddress is required and must include fullName, phone, line1, city, province, region, postalCode' }, 400)
  }
  const shippingAddress = body.shippingAddress

  const successUrl = typeof body.successUrl === 'string' ? body.successUrl.trim() : ''
  const cancelUrl  = typeof body.cancelUrl  === 'string' ? body.cancelUrl.trim()  : ''
  if (!successUrl || !cancelUrl) {
    return json({ error: 'successUrl and cancelUrl are required' }, 400)
  }

  // ── Fetch book ──────────────────────────────────────────────────────────────
  const { data: book, error: bookErr } = await adminClient
    .from('books')
    .select('id, title, author, price_centavos, stock, is_published')
    .eq('id', bookId)
    .maybeSingle()

  if (bookErr) {
    console.error('[create-book-checkout] Book fetch error:', bookErr)
    return json({ error: 'Failed to load book' }, 500)
  }
  if (!book) return json({ error: 'Book not found' }, 404)
  if (!book.is_published) return json({ error: 'Book not available for purchase' }, 400)
  if (book.stock < qty)   return json({ error: 'Insufficient stock' }, 400)

  const unitPrice = book.price_centavos as number
  const total     = unitPrice * qty

  // ── Decrement stock atomically ──────────────────────────────────────────────
  const { data: stockOk, error: stockErr } = await adminClient.rpc('decrement_book_stock', {
    p_book_id: bookId,
    p_qty:     qty,
  })

  if (stockErr) {
    console.error('[create-book-checkout] Stock decrement error:', stockErr)
    return json({ error: 'Failed to reserve stock' }, 500)
  }
  if (stockOk !== true) {
    return json({ error: 'Insufficient stock' }, 400)
  }

  // ── Insert pending order ────────────────────────────────────────────────────
  const { data: orderRow, error: orderErr } = await adminClient
    .from('book_orders')
    .insert({
      user_id:               user.id,
      book_id:               bookId,
      qty,
      unit_price_centavos:   unitPrice,
      total_centavos:        total,
      shipping_address:      shippingAddress,
      status:                'pending',
    })
    .select('id')
    .single()

  if (orderErr || !orderRow) {
    console.error('[create-book-checkout] Order insert error:', orderErr)
    // Roll back stock
    await adminClient.rpc('restock_book', { p_book_id: bookId, p_qty: qty })
    return json({ error: 'Failed to create order' }, 500)
  }

  const orderId = (orderRow as { id: string }).id

  // ── Create PayMongo Checkout Session ────────────────────────────────────────
  const pmPayload = {
    data: {
      attributes: {
        line_items: [
          {
            amount:   total,
            currency: 'PHP',
            name:     book.title,
            quantity: 1,                          // qty already baked into total
          },
        ],
        payment_method_types: ['gcash', 'paymaya'],
        success_url:          successUrl,
        cancel_url:           cancelUrl,
        metadata: {
          kind:     'book',
          user_id:  user.id,
          order_id: orderId,
        },
        description:        `${book.title}${book.author ? ' — ' + book.author : ''}`,
        send_email_receipt: false,
        show_description:   true,
        show_line_items:    true,
      },
    },
  }

  const pmRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
    },
    body: JSON.stringify(pmPayload),
  })

  if (!pmRes.ok) {
    const errBody = await pmRes.text()
    console.error('[create-book-checkout] PayMongo error:', pmRes.status, errBody)
    // Roll back: cancel the order + restock
    await adminClient
      .from('book_orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId)
    await adminClient.rpc('restock_book', { p_book_id: bookId, p_qty: qty })
    return json({ error: 'Failed to create checkout session. Please try again.' }, 502)
  }

  const pmData = await pmRes.json() as {
    data: {
      id: string
      attributes: { checkout_url: string }
    }
  }

  // ── Update order with PayMongo session id ───────────────────────────────────
  const { error: updateErr } = await adminClient
    .from('book_orders')
    .update({ paymongo_session_id: pmData.data.id })
    .eq('id', orderId)

  if (updateErr) {
    // Non-fatal — order exists, session exists, webhook can still match by metadata.order_id
    console.error('[create-book-checkout] Failed to attach session id to order (non-fatal):', updateErr)
  }

  return json({
    checkoutUrl: pmData.data.attributes.checkout_url,
    sessionId:   pmData.data.id,
    orderId,
  })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
