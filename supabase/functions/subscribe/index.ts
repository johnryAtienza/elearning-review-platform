/**
 * subscribe - Supabase Edge Function
 *
 * Disabled for production security.
 *
 * This endpoint used to create or extend a user's Standard subscription with
 * only a valid user JWT. That bypassed PayMongo verification and made it a
 * client-callable free subscription extension path.
 *
 * Subscription changes must now go through trusted server paths:
 *   - verify-payment / paymongo-webhook for paid checkout sessions
 *   - a future admin-only edge function for manual renewals
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  return json(
    {
      error: 'Direct subscription activation is disabled. Use checkout verification or an admin-only workflow.',
      code:  'SUBSCRIBE_DISABLED',
    },
    410,
  )
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
