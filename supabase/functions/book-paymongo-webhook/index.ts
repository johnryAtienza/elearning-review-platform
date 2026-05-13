/**
 * book-paymongo-webhook — Supabase Edge Function
 *
 * Async PayMongo webhook handler for BOOK purchases. Mirrors the
 * existing paymongo-webhook (subscription) shape but is a separate
 * function so the working subscription path is never modified.
 *
 * Triggers when PayMongo delivers `checkout_session.payment.paid` for
 * a session created by create-book-checkout (identified by
 * metadata.kind === 'book').
 *
 * Idempotent: book_orders.paymongo_session_id is UNIQUE, and the
 * status check skips if already paid/shipped/delivered.
 *
 * No JWT auth — verified via PayMongo HMAC-SHA256 signature.
 *
 * POST /functions/v1/book-paymongo-webhook
 * Headers: Paymongo-Signature: t=TIMESTAMP,te=HMAC_TEST,li=HMAC_LIVE
 *
 * Required Supabase secrets:
 *   PAYMONGO_WEBHOOK_SECRET=whsk_test_xxx   (can be the same secret as the
 *                                            subscription webhook if you
 *                                            register both endpoints with
 *                                            the same signing secret;
 *                                            PayMongo allows multiple
 *                                            webhooks per project)
 *
 * How to register in PayMongo Dashboard:
 *   1. Developers → Webhooks → Add endpoint
 *   2. URL: https://<project-ref>.supabase.co/functions/v1/book-paymongo-webhook
 *   3. Events: checkout_session.payment.paid
 *   4. Copy the signing secret → set as PAYMONGO_WEBHOOK_SECRET (or use a
 *      dedicated PAYMONGO_BOOK_WEBHOOK_SECRET if you keep them separate)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, paymongo-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  const webhookSecret = Deno.env.get('PAYMONGO_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[book-paymongo-webhook] PAYMONGO_WEBHOOK_SECRET is not set')
    return json({ error: 'Webhook not configured' }, 500)
  }

  // ── Read raw body (needed for signature verification) ───────────────────────
  const rawBody = await req.text()

  // ── Verify PayMongo HMAC signature ──────────────────────────────────────────
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
    console.warn('[book-paymongo-webhook] Missing signature parts. Header:', sigHeader)
    return json({ error: 'Invalid or missing Paymongo-Signature header' }, 400)
  }

  const isValid = await verifyHmac(webhookSecret, `${timestamp}.${rawBody}`, testHmac)
  if (!isValid) {
    console.warn('[book-paymongo-webhook] Signature verification failed')
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
  console.log('[book-paymongo-webhook] Received event:', eventType)

  if (eventType !== 'checkout_session.payment.paid') {
    return json({ received: true, eventType, note: 'event ignored' })
  }

  const sessionData = event.data.attributes.data
  const metadata    = sessionData?.attributes?.metadata ?? {}
  const sessionId   = sessionData?.id ?? ''
  const kind        = metadata.kind ?? ''
  const orderId     = metadata.order_id ?? ''
  const userId      = metadata.user_id ?? ''

  // Defensive: ignore subscription events that may have been routed here
  // by mistake (e.g. user registered the same URL for both endpoints).
  if (kind && kind !== 'book') {
    return json({ received: true, ignored: true, reason: `kind=${kind}` })
  }

  if (!orderId || !userId || !sessionId) {
    console.error('[book-paymongo-webhook] Missing metadata or session id', { orderId, userId, sessionId })
    return json({ error: 'Missing order_id, user_id, or session id' }, 400)
  }

  // ── Locate the order and apply paid status ─────────────────────────────────
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const { data: order, error: orderErr } = await adminClient
    .from('book_orders')
    .select('id, status, user_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr) {
    console.error('[book-paymongo-webhook] Order fetch error:', orderErr)
    return json({ error: 'Failed to load order' }, 500)
  }
  if (!order) {
    console.error('[book-paymongo-webhook] Order not found:', orderId)
    return json({ error: 'Order not found' }, 404)
  }
  if (order.user_id !== userId) {
    console.error('[book-paymongo-webhook] user_id mismatch:', order.user_id, '!=', userId)
    return json({ error: 'user_id mismatch on order' }, 400)
  }

  // Idempotency — already advanced past pending
  if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
    console.log('[book-paymongo-webhook] Already processed:', orderId, '→', order.status)
    return json({ received: true, alreadyProcessed: true, status: order.status })
  }

  // Cancelled orders should not be flipped back to paid by a late webhook
  if (order.status === 'cancelled') {
    console.warn('[book-paymongo-webhook] Webhook arrived for cancelled order:', orderId)
    return json({ received: true, ignored: true, reason: 'order cancelled' })
  }

  const { error: updateErr } = await adminClient
    .from('book_orders')
    .update({
      status:               'paid',
      paid_at:              new Date().toISOString(),
      paymongo_session_id:  sessionId,    // overwrite in case create flow's update step failed
    })
    .eq('id', orderId)

  if (updateErr) {
    console.error('[book-paymongo-webhook] Update error:', updateErr)
    return json({ error: 'Failed to mark order paid' }, 500)
  }

  console.log(`[book-paymongo-webhook] Order ${orderId} marked paid for user ${userId}`)
  return json({ received: true })
})

// ── HMAC-SHA256 verification (matches paymongo-webhook) ───────────────────────

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
    console.error('[book-paymongo-webhook] HMAC error:', e)
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
