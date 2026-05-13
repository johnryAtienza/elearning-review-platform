/**
 * verify-book-payment — Supabase Edge Function
 *
 * Verifies a PayMongo Checkout Session for a book purchase and marks the
 * book_orders row as paid. Mirrors the existing verify-payment shape but
 * is a separate function so the working subscription path is never modified.
 *
 * Called from PaymentSuccessPage after PayMongo redirects back. Idempotent
 * via book_orders.paymongo_session_id (UNIQUE).
 *
 * POST /functions/v1/verify-book-payment
 * Authorization: Bearer <supabase-jwt>
 * Body: { sessionId: string }
 *
 * Success 200: { orderId, status, alreadyProcessed }
 * Error   400: invalid/missing sessionId
 * Error   401: unauthorized
 * Error   402: payment not yet completed
 * Error   403: session belongs to a different user
 * Error   404: order or session not found
 * Error   500: server / database error
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
    console.error('[verify-book-payment] PAYMONGO_SECRET_KEY is not set')
    return json({ error: 'Payment service not configured' }, 500)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { sessionId?: unknown }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) return json({ error: 'sessionId is required' }, 400)

  // ── Locate the order by session id ──────────────────────────────────────────
  const { data: order, error: orderErr } = await adminClient
    .from('book_orders')
    .select('id, user_id, status')
    .eq('paymongo_session_id', sessionId)
    .maybeSingle()

  if (orderErr) {
    console.error('[verify-book-payment] Order fetch error:', orderErr)
    return json({ error: 'Failed to load order' }, 500)
  }
  if (!order) return json({ error: 'Order not found for this checkout session' }, 404)

  // ── Ownership check — prevent session hijacking ─────────────────────────────
  if (order.user_id !== user.id) {
    console.error('[verify-book-payment] user_id mismatch:', order.user_id, '!=', user.id)
    return json({ error: 'Order does not belong to this user' }, 403)
  }

  // ── Idempotency — already processed? ───────────────────────────────────────
  if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
    return json({
      orderId:          order.id,
      status:           order.status,
      alreadyProcessed: true,
    })
  }

  // ── Fetch checkout session from PayMongo ────────────────────────────────────
  const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
    },
  })

  if (!pmRes.ok) {
    console.error('[verify-book-payment] PayMongo fetch error:', pmRes.status, await pmRes.text())
    return json({ error: 'Failed to verify payment. Please try again.' }, 502)
  }

  const pmData = await pmRes.json() as PayMongoCheckoutSession
  const attrs  = pmData.data.attributes

  // Defensive: confirm metadata kind === 'book' so we don't misroute a
  // subscription session through this endpoint.
  if (attrs.metadata?.kind && attrs.metadata.kind !== 'book') {
    return json({ error: 'Session is not a book purchase' }, 400)
  }

  // ── Check payment status ────────────────────────────────────────────────────
  const paymentIntentStatus = attrs.payment_intent?.attributes?.status
  const firstPaymentStatus  = attrs.payments?.[0]?.attributes?.status
  const isPaid =
    paymentIntentStatus === 'succeeded' ||
    firstPaymentStatus  === 'paid'

  if (!isPaid) {
    console.warn('[verify-book-payment] Not paid yet. Intent:', paymentIntentStatus, '| Payment:', firstPaymentStatus)
    return json({ error: 'Payment has not been completed yet.' }, 402)
  }

  // ── Mark order as paid ──────────────────────────────────────────────────────
  const { error: updateErr } = await adminClient
    .from('book_orders')
    .update({
      status:  'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateErr) {
    console.error('[verify-book-payment] Order update error:', updateErr)
    return json({ error: 'Failed to mark order as paid. Please contact support.' }, 500)
  }

  console.log(`[verify-book-payment] Order ${order.id} marked paid for user ${user.id}`)

  return json({
    orderId:          order.id,
    status:           'paid',
    alreadyProcessed: false,
  })
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayMongoCheckoutSession {
  data: {
    id: string
    attributes: {
      metadata?: Record<string, string>
      payment_intent?: {
        attributes: { status: string }
      }
      payments?: Array<{
        attributes: { status: string }
      }>
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
