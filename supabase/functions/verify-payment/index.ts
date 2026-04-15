/**
 * verify-payment — Supabase Edge Function
 *
 * Verifies a PayMongo Checkout Session and activates the user's subscription.
 * Called from the frontend success page after PayMongo redirects back.
 *
 * POST /functions/v1/verify-payment
 * Authorization: Bearer <supabase-jwt>
 * Body: { sessionId: string }
 *
 * Success 200: { tier, expiresAt, daysAdded, alreadyProcessed }
 * Error   400: invalid/missing sessionId
 * Error   401: unauthorized
 * Error   402: payment not yet completed
 * Error   403: session belongs to a different user
 * Error   500: server / database error
 *
 * Idempotent — safe to call multiple times for the same sessionId.
 * Uses the `payments` table to track processed sessions.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mirrors create-checkout prices
const PRICE_CENTAVOS: Record<number, number> = {
  1: 29900,
  3: 80700,
  6: 143400,
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
    console.error('[verify-payment] PAYMONGO_SECRET_KEY is not set')
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

  // ── Idempotency — already processed? ───────────────────────────────────────
  const { data: existing } = await adminClient
    .from('payments')
    .select('id, duration_months')
    .eq('paymongo_id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .maybeSingle()

  if (existing) {
    console.log('[verify-payment] Already processed:', sessionId)
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('tier, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    return json({
      tier:             sub?.tier ?? 'standard',
      expiresAt:        (sub as { expires_at?: string | null } | null)?.expires_at ?? null,
      daysAdded:        0,
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
    console.error('[verify-payment] PayMongo fetch error:', pmRes.status, await pmRes.text())
    return json({ error: 'Failed to verify payment. Please try again.' }, 502)
  }

  const pmData = await pmRes.json() as PayMongoCheckoutSession
  const attrs  = pmData.data.attributes

  // ── Ownership check — prevent session hijacking ─────────────────────────────
  if (attrs.metadata?.user_id !== user.id) {
    console.error('[verify-payment] user_id mismatch:', attrs.metadata?.user_id, '!=', user.id)
    return json({ error: 'Session does not belong to this user' }, 403)
  }

  // ── Check payment status ────────────────────────────────────────────────────
  // PayMongo sets payment_intent.status to 'succeeded' when paid.
  // Some integrations may also expose payments[0].attributes.status = 'paid'.
  const paymentIntentStatus = attrs.payment_intent?.attributes?.status
  const firstPaymentStatus  = attrs.payments?.[0]?.attributes?.status
  const isPaid =
    paymentIntentStatus === 'succeeded' ||
    firstPaymentStatus  === 'paid'

  if (!isPaid) {
    console.warn('[verify-payment] Payment not completed. Intent status:', paymentIntentStatus, '| Payment status:', firstPaymentStatus)
    return json({ error: 'Payment has not been completed yet.' }, 402)
  }

  const durationMonths = Number(attrs.metadata?.duration_months ?? 1)
  if (![1, 3, 6].includes(durationMonths)) {
    console.error('[verify-payment] Invalid duration in metadata:', attrs.metadata?.duration_months)
    return json({ error: 'Invalid subscription duration in session.' }, 400)
  }

  // ── Activate subscription ───────────────────────────────────────────────────
  const { data: subData, error: dbError } = await adminClient
    .rpc('extend_subscription', {
      p_user_id:         user.id,
      p_duration_months: durationMonths,
      p_tier:            'standard',
    })
    .single()

  if (dbError || !subData) {
    console.error('[verify-payment] DB error:', dbError?.message)
    return json({ error: 'Failed to activate subscription. Please contact support.' }, 500)
  }

  // ── Record payment for idempotency ──────────────────────────────────────────
  await adminClient.from('payments').upsert(
    {
      user_id:         user.id,
      paymongo_id:     sessionId,
      amount:          PRICE_CENTAVOS[durationMonths] ?? 29900,
      currency:        'PHP',
      duration_months: durationMonths,
      status:          'paid',
      paid_at:         new Date().toISOString(),
    },
    { onConflict: 'paymongo_id' }
  )

  const row = subData as {
    new_expires_at:      string | null
    previous_expires_at: string | null
    days_added:          number
  }

  console.log(`[verify-payment] Subscription activated — user: ${user.id}, +${durationMonths} months, expires: ${row.new_expires_at}`)

  return json({
    tier:             'standard',
    expiresAt:        row.new_expires_at,
    daysAdded:        row.days_added,
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
