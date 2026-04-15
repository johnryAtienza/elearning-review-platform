/**
 * create-checkout — Supabase Edge Function
 *
 * Creates a PayMongo Checkout Session for the Standard subscription plan.
 * Supports GCash and Maya (paymaya) as payment methods.
 *
 * POST /functions/v1/create-checkout
 * Authorization: Bearer <supabase-jwt>
 * Body: {
 *   durationMonths: 1 | 3 | 6
 *   successUrl: string   // e.g. https://app.com/payment-success?session_id={CHECKOUT_SESSION_ID}
 *   cancelUrl:  string   // e.g. https://app.com/payment-cancel
 * }
 *
 * Success 200: { checkoutUrl: string, sessionId: string }
 * Error   400: invalid body / bad duration
 * Error   401: missing / invalid JWT
 * Error   500: PayMongo API error or missing config
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   PAYMONGO_SECRET_KEY=sk_test_xxx
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_DURATIONS = new Set([1, 3, 6])

// Prices in centavos (PHP). Mirrors frontend subscriptionService.ts pricing:
//   1 month : ₱299.00/mo × 1 = ₱299    (0% off)
//   3 months: ₱269.10/mo × 3 ≈ ₱807    (10% off, rounded)
//   6 months: ₱239.20/mo × 6 ≈ ₱1,434  (20% off, rounded)
const PRICE_CENTAVOS: Record<number, number> = {
  1: 29900,
  3: 80700,
  6: 143400,
}

const PLAN_LABELS: Record<number, string> = {
  1: '1 Month',
  3: '3 Months',
  6: '6 Months',
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
    console.error('[create-checkout] PAYMONGO_SECRET_KEY is not set')
    return json({ error: 'Payment service not configured. Contact support.' }, 500)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    console.error('[create-checkout] Auth error:', authError?.message)
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { durationMonths?: unknown; successUrl?: unknown; cancelUrl?: unknown }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const durationMonths = Number(body.durationMonths)
  if (!VALID_DURATIONS.has(durationMonths)) {
    return json({ error: 'durationMonths must be 1, 3, or 6' }, 400)
  }

  const successUrl = typeof body.successUrl === 'string' ? body.successUrl.trim() : ''
  const cancelUrl  = typeof body.cancelUrl  === 'string' ? body.cancelUrl.trim()  : ''

  if (!successUrl || !cancelUrl) {
    return json({ error: 'successUrl and cancelUrl are required' }, 400)
  }

  // ── Create PayMongo Checkout Session ────────────────────────────────────────
  const amount = PRICE_CENTAVOS[durationMonths]
  const label  = PLAN_LABELS[durationMonths]

  const pmPayload = {
    data: {
      attributes: {
        line_items: [
          {
            amount,
            currency: 'PHP',
            name: `Standard Plan — ${label}`,
            quantity: 1,
          },
        ],
        payment_method_types: ['gcash', 'paymaya'],
        success_url: successUrl,
        cancel_url:  cancelUrl,
        metadata: {
          user_id:         user.id,
          duration_months: String(durationMonths),
        },
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
    console.error('[create-checkout] PayMongo error:', pmRes.status, errBody)
    return json({ error: 'Failed to create checkout session. Please try again.' }, 502)
  }

  const pmData = await pmRes.json() as {
    data: {
      id: string
      attributes: { checkout_url: string }
    }
  }

  return json({
    checkoutUrl: pmData.data.attributes.checkout_url,
    sessionId:   pmData.data.id,
  })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
