/**
 * get-signed-urls — Supabase Edge Function
 *
 * Generates short-lived R2 presigned GET URLs for a lesson's video and PDF.
 * Only issued to authenticated users with an active subscription.
 * R2 credentials stay server-side; the browser never sees them.
 *
 * POST /functions/v1/get-signed-urls
 * Authorization: Bearer <supabase-jwt>
 * Body: { lessonId: string }
 *
 * Response: { videoUrl?: string; pdfUrl?: string }
 *   Each field is present only when the lesson has a stored path for it.
 *
 * Error responses:
 *   401  — missing / invalid JWT
 *   403  — no active subscription
 *   404  — lesson not found
 *   500  — server / credentials error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Signed URL TTL: 1 hour — enough for any reasonable viewing session. */
const SIGNED_URL_TTL = 3_600

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json(null, 204)
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── Verify JWT ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // User-scoped client — inherits the caller's RLS context
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Service-role client — used to query subscriptions bypassing RLS safely
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Check subscription ───────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) {
    return json({ error: 'No active subscription' }, 403)
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { lessonId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { lessonId } = body
  if (!lessonId) {
    return json({ error: 'lessonId is required' }, 400)
  }

  // ── Fetch lesson storage paths ───────────────────────────────────────────────
  // Use service-role so we get the real paths regardless of RLS.
  // The subscription check above is the real gate.
  const { data: lesson, error: lessonError } = await adminClient
    .from('lessons')
    .select('video_url, reviewer_pdf_url')
    .eq('id', lessonId)
    .maybeSingle()

  if (lessonError) {
    console.error('[get-signed-urls] Lesson fetch error:', lessonError)
    return json({ error: 'Failed to fetch lesson' }, 500)
  }
  if (!lesson) {
    return json({ error: 'Lesson not found' }, 404)
  }

  const videoPath = lesson.video_url as string | null
  const pdfPath   = lesson.reviewer_pdf_url as string | null

  // If neither file is stored yet, return empty
  if (!videoPath && !pdfPath) {
    return json({ videoUrl: null, pdfUrl: null })
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
      videoPath
        ? getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucketName, Key: videoPath }),
            { expiresIn: SIGNED_URL_TTL },
          )
        : Promise.resolve(null),

      pdfPath
        ? getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucketName, Key: pdfPath }),
            { expiresIn: SIGNED_URL_TTL },
          )
        : Promise.resolve(null),
    ])

    return json({ videoUrl, pdfUrl })
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
