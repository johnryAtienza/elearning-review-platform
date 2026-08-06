/**
 * get-signed-urls — Supabase Edge Function
 *
 * Returns short-lived (60s) presigned R2 GET URLs for a lesson's video and PDF.
 * This function is the only path from the browser to R2 and is therefore the
 * actual security boundary for premium content — the React route guards above
 * it are UX only.
 *
 * Access matrix (authoritative):
 *
 *   ┌──────────────────────────┬──────────────────────┬────────────────────────┐
 *   │ Caller                   │ is_free_preview=TRUE │ is_free_preview=FALSE  │
 *   ├──────────────────────────┼──────────────────────┼────────────────────────┤
 *   │ Guest (no JWT)           │ 200 tier=standard    │ 401 Unauthorized       │
 *   │ Authenticated free       │ 200 tier=standard    │ 403 Forbidden          │
 *   │ Authenticated subscribed │ 200 tier=standard    │ 200 tier=standard      │
 *   │ Admin                    │ 200 tier=standard    │ 200 tier=standard      │
 *   └──────────────────────────┴──────────────────────┴────────────────────────┘
 *
 * Subscription status is the source of truth for premium content. Logging in
 * alone grants nothing beyond preview lessons. `is_free_preview` is the only
 * per-lesson carve-out — it is set server-side by admins and never inferred
 * from client input. Preview lessons always play in full (tier: standard) so
 * the VideoPlayer does not apply the 30s free-tier cap.
 *
 * POST /functions/v1/get-signed-urls
 * Authorization: Bearer <supabase-jwt>   (optional — required for premium)
 * Body: { lessonId: string }
 *
 * Error responses:
 *   400 — invalid body / missing lessonId
 *   401 — premium lesson requested without a valid session
 *   403 — premium lesson requested by a non-subscribed authenticated user
 *   404 — lesson not found
 *   500 — server / credentials error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Signed URL TTL: 60 seconds — short enough to limit URL sharing, long enough to start streaming */
const SIGNED_URL_TTL = 60

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  // ── Resolve caller (guest is OK; access decision happens after lesson fetch) ─
  const authHeader = req.headers.get('Authorization') ?? ''
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Supabase JS sends the anon key in the Authorization header when there is no
  // user session. Treat that as a guest: getUser() will return no user for the
  // anon key, so the user check below correctly stays null.
  let userId:  string | null = null
  let isAdmin                = false
  if (token) {
    const { data } = await adminClient.auth.getUser(token)
    if (data?.user) {
      userId  = data.user.id
      isAdmin = data.user.app_metadata?.role === 'admin'
    }
  }

  // ── Determine subscription tier (authenticated users only) ───────────────────
  let tier: 'free' | 'standard' = 'free'
  if (userId) {
    const now = new Date().toISOString()
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()
    if (sub) tier = 'standard'
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { lessonId?: string }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const { lessonId } = body
  if (!lessonId) return json({ error: 'lessonId is required' }, 400)

  // ── Fetch lesson storage paths + access flag ─────────────────────────────────
  const { data: lesson, error: lessonError } = await adminClient
    .from('lessons')
    .select('subject_id, video_url, reviewer_pdf_url, is_free_preview')
    .eq('id', lessonId)
    .maybeSingle()

  if (lessonError) {
    console.error('[get-signed-urls] Lesson fetch error:', lessonError)
    return json({ error: 'Failed to fetch lesson' }, 500)
  }
  if (!lesson) return json({ error: 'Lesson not found' }, 404)

  const { data: subject } = await adminClient
    .from('subjects')
    .select('id')
    .eq('id', lesson.subject_id)
    .eq('is_published', true)
    .maybeSingle()
  if (!subject) return json({ error: 'Lesson not found' }, 404)

  // ── Authorize ────────────────────────────────────────────────────────────────
  const isPreview = lesson.is_free_preview === true
  const canAccess = isPreview || isAdmin || tier === 'standard'

  if (!canAccess) {
    // Distinguish guest (sign in / subscribe) from authenticated free (subscribe).
    return userId
      ? json({ error: 'Subscription required' }, 403)
      : json({ error: 'Unauthorized' },          401)
  }

  // Preview lessons grant standard-tier limits for everyone so the video plays
  // in full. Premium lessons reach this branch only for subscribed/admin users,
  // who are already standard tier.
  const effectiveTier: 'free' | 'standard' = isPreview ? 'standard' : tier

  const videoPath = lesson.video_url        as string | null
  const pdfPath   = lesson.reviewer_pdf_url as string | null

  const shouldSignVideo = !!videoPath
  const shouldSignPdf   = !!pdfPath

  if (!shouldSignVideo && !shouldSignPdf) {
    return json({ videoUrl: null, pdfUrl: null, tier: effectiveTier })
  }

  // ── Build R2 client ──────────────────────────────────────────────────────────
  const accountId       = Deno.env.get('R2_ACCOUNT_ID')
  const accessKeyId     = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucketName      = Deno.env.get('R2_BUCKET_NAME')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[get-signed-urls] Missing R2 env vars')
    return json({ error: 'Storage not configured' }, 500)
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  // ── Generate signed GET URLs ─────────────────────────────────────────────────
  try {
    const [videoUrl, pdfUrl] = await Promise.all([
      shouldSignVideo
        ? getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: videoPath! }), { expiresIn: SIGNED_URL_TTL })
        : Promise.resolve(null),

      shouldSignPdf
        ? getSignedUrl(s3, new GetObjectCommand({
            Bucket: bucketName,
            Key: pdfPath!,
            ResponseContentDisposition: 'inline',
            ResponseContentType: 'application/pdf',
          }), { expiresIn: SIGNED_URL_TTL })
        : Promise.resolve(null),
    ])

    return json({ videoUrl, pdfUrl, tier: effectiveTier })
  } catch (err) {
    console.error('[get-signed-urls] Presign error:', err)
    return json({ error: 'Failed to generate signed URLs' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
