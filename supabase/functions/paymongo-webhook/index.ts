/**
 * paymongo-webhook — Supabase Edge Function
 *
 * Receives PayMongo webhook events and activates subscriptions.
 * This is the server-side handler — it fires when PayMongo delivers the
 * `checkout_session.payment.paid` event, regardless of whether the user
 * returned to the app after payment.
 *
 * No JWT auth — verified by HMAC-SHA256 signature instead.
 *
 * POST /functions/v1/paymongo-webhook
 * Headers: Paymongo-Signature: t=TIMESTAMP,te=HMAC_TEST,li=HMAC_LIVE
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   PAYMONGO_WEBHOOK_SECRET=whsk_test_xxx
 *
 * How to register this webhook in PayMongo Dashboard:
 *   1. Go to Developers → Webhooks → Add endpoint
 *   2. URL: https://<project-ref>.supabase.co/functions/v1/paymongo-webhook
 *   3. Events: checkout_session.payment.paid
 *   4. Copy the signing secret → set as PAYMONGO_WEBHOOK_SECRET
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, paymongo-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mirrors create-checkout and verify-payment prices
const PRICE_CENTAVOS: Record<number, number> = {
  1: 29900,
  3: 80700,
  6: 143400,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  const webhookSecret = Deno.env.get('PAYMONGO_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[paymongo-webhook] PAYMONGO_WEBHOOK_SECRET is not set')
    return json({ error: 'Webhook not configured' }, 500)
  }

  // ── Read raw body (needed for signature verification) ───────────────────────
  const rawBody = await req.text()

  // ── Verify PayMongo HMAC signature ──────────────────────────────────────────
  // Header format: "t=TIMESTAMP,te=HMAC_SHA256_TEST,li=HMAC_SHA256_LIVE"
  const sigHeader = req.headers.get('Paymongo-Signature') ?? ''
  const sigParts  = Object.fromEntries(
    sigHeader.split(',').flatMap((part) => {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) return []
      return [[part.slice(0, eqIdx).trim(), part.slice(eqIdx + 1).trim()]]
    })
  )

  const timestamp = sigParts['t']  ?? ''
  const testHmac  = sigParts['te'] ?? ''

  if (!timestamp || !testHmac) {
    console.warn('[paymongo-webhook] Missing signature parts. Header:', sigHeader)
    return json({ error: 'Invalid or missing Paymongo-Signature header' }, 400)
  }

  const isValid = await verifyHmac(webhookSecret, `${timestamp}.${rawBody}`, testHmac)
  if (!isValid) {
    console.warn('[paymongo-webhook] Signature verification failed')
    return json({ error: 'Signature verification failed' }, 401)
  }

  // ── Parse event ──────────────────────────────────────────────────────────────
  let event: PayMongoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const eventType = event?.data?.attributes?.type
  console.log('[paymongo-webhook] Received event:', eventType)

  // Only handle checkout session paid events
  if (eventType !== 'checkout_session.payment.paid') {
    return json({ received: true, eventType, note: 'event ignored' })
  }

  const sessionData = event.data.attributes.data
  const metadata    = sessionData?.attributes?.metadata ?? {}
  const userId      = metadata.user_id
  const duration    = Number(metadata.duration_months ?? 1)
  const sessionId   = sessionData?.id ?? ''

  if (!userId) {
    console.error('[paymongo-webhook] Missing user_id in metadata:', metadata)
    return json({ error: 'Missing user_id in event metadata' }, 400)
  }

  if (![1, 3, 6].includes(duration)) {
    console.error('[paymongo-webhook] Invalid duration in metadata:', metadata.duration_months)
    return json({ error: 'Invalid duration_months in event metadata' }, 400)
  }

  // ── Idempotency check ────────────────────────────────────────────────────────
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const { data: existing } = await adminClient
    .from('payments')
    .select('id')
    .eq('paymongo_id', sessionId)
    .eq('status', 'paid')
    .maybeSingle()

  if (existing) {
    console.log('[paymongo-webhook] Payment already processed (idempotent):', sessionId)
    return json({ received: true, alreadyProcessed: true })
  }

  // ── Activate subscription ────────────────────────────────────────────────────
  const { error: dbError } = await adminClient.rpc('extend_subscription', {
    p_user_id:         userId,
    p_duration_months: duration,
    p_tier:            'standard',
  })

  if (dbError) {
    console.error('[paymongo-webhook] DB error extending subscription:', dbError.message)
    return json({ error: 'Failed to activate subscription' }, 500)
  }

  // ── Record payment (idempotency guard for future calls) ──────────────────────
  await adminClient.from('payments').upsert(
    {
      user_id:         userId,
      paymongo_id:     sessionId,
      amount:          PRICE_CENTAVOS[duration] ?? 29900,
      currency:        'PHP',
      duration_months: duration,
      status:          'paid',
      paid_at:         new Date().toISOString(),
    },
    { onConflict: 'paymongo_id' }
  )

  console.log(`[paymongo-webhook] Subscription activated — user: ${userId}, +${duration} months`)
  return json({ received: true })
})

// ── HMAC-SHA256 verification ──────────────────────────────────────────────────

async function verifyHmac(secret: string, message: string, expectedHex: string): Promise<boolean> {
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sig    = await crypto.subtle.sign('HMAC', key, enc.encode(message))
    const hexSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hexSig === expectedHex
  } catch (e) {
    console.error('[paymongo-webhook] HMAC error:', e)
    return false
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayMongoWebhookEvent {
  data: {
    id: string
    attributes: {
      type: string
      data?: {
        id: string
        attributes: {
          metadata: Record<string, string>
          payment_intent?: { attributes: { status: string } }
          payments?: Array<{ attributes: { status: string } }>
        }
      }
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
