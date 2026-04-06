/**
 * get-signed-urls — Supabase Edge Function
 *
 * Generates short-lived R2 presigned GET URLs for a lesson's video and PDF.
 * Accessible to all authenticated users; the response varies by subscription tier:
 *
 *   free tier     — { videoUrl: null, pdfUrl: string | null, tier: "free" }
 *   standard tier — { videoUrl: string | null, pdfUrl: string | null, tier: "standard" }
 *
 * Frontend enforces additional UX-layer restrictions (30s preview, 5-page PDF limit).
 * For true enforcement, a separate PDF-truncation step should be added for free users.
 *
 * POST /functions/v1/get-signed-urls
 * Authorization: Bearer <supabase-jwt>
 * Body: { lessonId: string }
 *
 * Error responses:
 *   401 — missing / invalid JWT
 *   404 — lesson not found
 *   500 — server / credentials error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Signed URL TTL: 1 hour */
const SIGNED_URL_TTL = 3_600

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── Verify JWT ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    console.error('[get-signed-urls] Auth error:', authError?.message, authError?.status)
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Determine subscription tier ──────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('id, tier')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  // A valid subscription row = standard tier; absence = free tier
  const tier: 'free' | 'standard' = sub ? 'standard' : 'free'

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { lessonId?: string }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const { lessonId } = body
  if (!lessonId) return json({ error: 'lessonId is required' }, 400)

  // ── Fetch lesson storage paths ───────────────────────────────────────────────
  const { data: lesson, error: lessonError } = await adminClient
    .from('lessons')
    .select('video_url, reviewer_pdf_url')
    .eq('id', lessonId)
    .maybeSingle()

  if (lessonError) {
    console.error('[get-signed-urls] Lesson fetch error:', lessonError)
    return json({ error: 'Failed to fetch lesson' }, 500)
  }
  if (!lesson) return json({ error: 'Lesson not found' }, 404)

  const videoPath = lesson.video_url as string | null
  const pdfPath   = lesson.reviewer_pdf_url as string | null

  // Free tier gets PDF access only — video is null
  const shouldSignVideo = tier === 'standard' && !!videoPath
  const shouldSignPdf   = !!pdfPath   // both tiers can access PDF (page limit enforced on frontend)

  if (!shouldSignVideo && !shouldSignPdf) {
    return json({ videoUrl: null, pdfUrl: null, tier })
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
        ? getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: pdfPath! }), { expiresIn: SIGNED_URL_TTL })
        : Promise.resolve(null),
    ])

    return json({ videoUrl, pdfUrl, tier })
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
